const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const brdService = require('../services/brd.service');

const prisma = new PrismaClient();

// This corresponds to a real API key or a fake one for Sandbox use
// In production, load from process.env.BRD_CLIENT_ID
const BRD_CLIENT_ID = process.env.BRD_CLIENT_ID || 'mock_brd_client_id_123';

/**
 * Initiates the BRD connection flow.
 * Returns the URL for our mock OAuth server, identical to the OAuth2 PKCE flow for BT.
 */
exports.initConsent = async (req, res) => {
    try {
        const userId = req.userId;

        // Generate PKCE code precisely as we do for BT
        const codeVerifier = crypto.randomBytes(32).toString('base64url');
        const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

        // Deactivate any existing BRD connections for this user to avoid duplicates
        await prisma.bankConnection.updateMany({
            where: { userId, bankName: 'BRD', status: { in: ['active', 'pending'] } },
            data: { status: 'replaced' }
        });

        // Store state in DB as pending
        const newConnection = await prisma.bankConnection.create({
            data: {
                userId,
                bankName: 'BRD',
                status: 'pending',
                codeVerifier, // Save the verifier to exchange tokens later
                clientId: BRD_CLIENT_ID
            }
        });

        // We build the URL pointing to our *own* server since BRD Sandbox lacks a real WebView
        const mockAuthUrl = `${process.env.API_URL || req.protocol + '://' + req.get('host')}/api/brd/oauth/authorize`;

        // The redirect URI expects to return to a safe dummy URL that the WebView intercepts (matching BT's flow)
        const redirectUri = process.env.BRD_REDIRECT_URI || 'https://google.com';

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: BRD_CLIENT_ID,
            redirect_uri: redirectUri,
            scope: 'AIS',
            state: newConnection.id, // State is our connection ID
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        });

        res.json({ authUrl: `${mockAuthUrl}?${params.toString()}` });

    } catch (error) {
        console.error('Error initiating BRD consent:', error);
        res.status(500).json({ error: 'Failed to initiate BRD connection' });
    }
};

/**
 * Exchanges the code from the WebView for mock tokens and persists them.
 */
exports.exchangeToken = async (req, res) => {
    try {
        const { code, state } = req.body;
        const connectionId = state;

        if (!code || !connectionId) {
            return res.status(400).json({ error: 'Mising code or state parameter' });
        }

        const connection = await prisma.bankConnection.findUnique({
            where: { id: connectionId }
        });

        if (!connection || connection.status !== 'pending') {
            return res.status(404).json({ error: 'Connection not found or no longer pending' });
        }

        // Prepare token request to our own local mock endpoint
        const tokenUrl = `${process.env.API_URL || req.protocol + '://' + req.get('host')}/api/brd/oauth/token`;
        const redirectUri = process.env.BRD_REDIRECT_URI || 'https://google.com';

        const tokenResponse = await axios.post(tokenUrl, new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: connection.clientId,
            code_verifier: connection.codeVerifier,
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // Persist tokens
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (expires_in || 3600));

        await prisma.bankConnection.update({
            where: { id: connectionId },
            data: {
                accessToken: access_token,
                refreshToken: refresh_token,
                tokenExpiresAt: expiresAt,
                status: 'active',
                codeVerifier: null // Wipe PKCE verifier after use
            }
        });

        res.json({ message: 'BRD Tokens exchanged successfully', connectionId });

    } catch (error) {
        console.error('Error exchanging BRD token:', error?.response?.data || error.message);
        res.status(500).json({ error: 'Failed to complete BRD connection' });
    }
};

/**
 * Fetch data for an active BRD connection.
 * Maps Sandbox data to the common Novence structure.
 */
exports.getConnectionData = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const userId = req.userId;

        // Basic auth check
        const connection = await prisma.bankConnection.findFirst({
            where: { id: connectionId, userId, bankName: 'BRD', status: 'active' }
        });

        if (!connection) {
            return res.status(404).json({ error: 'Active BRD connection not found' });
        }

        // Call real BRD endpoints via the service
        const allAccounts = await brdService.getAccounts(connection.clientId);

        // Prefer RON accounts; fall back to all accounts if none found
        const ronAccounts = allAccounts.filter(a => (a.currency || '').toUpperCase() === 'RON');
        const accounts = ronAccounts.length > 0 ? ronAccounts : allAccounts;

        let totalBalance = 0;
        const enrichedAccounts = [];

        // Combine multiple endpoints
        for (const acc of accounts) {
            // Get Balances
            const balancesList = await brdService.getBalances(connection.clientId, acc.resourceId);
            let currentBalance = 0;
            // Build balances array in the same format BT uses (BankContext expects this shape)
            const normalizedBalances = (balancesList?.balances || []).map(b => {
                const amt = parseFloat(b.balanceAmount?.amount || 0);
                currentBalance = amt; // use last iterated, or first below
                return {
                    balanceAmount: {
                        amount: String(b.balanceAmount?.amount ?? '0'),
                        currency: b.balanceAmount?.currency || acc.currency || 'RON',
                    },
                    balanceType: b.balanceType || 'interimAvailable',
                };
            });
            if (normalizedBalances.length > 0) {
                currentBalance = parseFloat(normalizedBalances[0].balanceAmount.amount);
                totalBalance += currentBalance;
            }

            // Normalize to match BT account schema used throughout BankContext
            enrichedAccounts.push({
                resourceId: acc.resourceId,
                iban: acc.iban,
                currency: acc.currency || 'RON',
                name: acc.name || `Cont BRD ${acc.currency || 'RON'}`,
                status: acc.status,
                balances: normalizedBalances,
                // Keep flat balance for any legacy usage
                balance: currentBalance,
            });
        }

        // Fetch transactions for the primary/first account
        let normalizedTransactions = [];
        if (enrichedAccounts.length > 0) {
            const primaryAcc = enrichedAccounts[0];
            const brdTransactions = await brdService.getTransactions(connection.clientId, primaryAcc.resourceId);

            const rawTransactions = [
                ...(brdTransactions?.booked || []),
                ...(brdTransactions?.pending || [])
            ];

            normalizedTransactions = rawTransactions.map(t => ({
                // Normalize to BT transaction schema so BankContext processes it identically
                transactionId: t.transactionId || t.endToEndId || crypto.randomUUID(),
                transactionAmount: {
                    amount: String(t.transactionAmount?.amount ?? t.amount ?? '0'),
                    currency: t.transactionAmount?.currency || t.currency || primaryAcc.currency || 'RON',
                },
                // BRD Sandbox provides creditDebitIndicator; fall back to type hint
                creditDebitIndicator: t.creditDebitIndicator || (t.type === 'debit' ? 'DBIT' : 'CRDT'),
                bookingDate: t.bookingDate || t.valueDate || t.date || new Date().toISOString().split('T')[0],
                valueDate: t.valueDate || t.bookingDate || t.date || new Date().toISOString().split('T')[0],
                remittanceInformationUnstructured:
                    t.remittanceInformationUnstructured || t.description || t.proprietaryBankTransactionCode || 'Tranzactie BRD',
                debtorName: t.debtorName || t.details?.debtorName || null,
                creditorName: t.creditorName || t.details?.creditorName || null,
                debtorAccount: t.debtorAccount || null,
                creditorAccount: t.creditorAccount || null,
            })).sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));
        }

        res.json({
            connection: {
                id: connection.id,
                bankName: connection.bankName,
                status: connection.status,
                updatedAt: connection.updatedAt
            },
            accounts: enrichedAccounts,
            totalBalance,
            transactions: normalizedTransactions
        });

    } catch (error) {
        console.error('Error fetching BRD data:', error);
        res.status(500).json({ error: 'Failed to fetch BRD account data' });
    }
};
