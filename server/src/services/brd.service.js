const axios = require('axios');
const crypto = require('crypto');

// BRD Sandbox details
const BRD_API_BASE_URL = 'https://api.devbrd.ro/brd-api-connect-prod-organization/apicatalog/brd-psd2-aisp/v1';
const BRD_SANDBOX_PSUID = '13333330'; // Sandbox user fixed by BRD
const BRD_SANDBOX_CONSENT_ID = '500000044'; // "valid with all psd2" — most permissive consent

/**
 * BRD Service handles communication with the underlying BRD Sandbox API.
 * The tokens are mock tokens, but the data fetched is real sandbox data.
 */
class BrdService {
    /**
     * Generates common headers for BRD requests.
     * @param {string} clientId API Key (X-IBM-Client-Id)
     * @param {string} ipAddress Target client IP
     */
    getCommonHeaders(clientId, ipAddress = '127.0.0.1') {
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-IBM-Client-Id': clientId,
            'X-Request-ID': crypto.randomUUID(), // Standard UUID v4
            'Consent-ID': BRD_SANDBOX_CONSENT_ID, // Valid consent with full access
            'PSU-ID': BRD_SANDBOX_PSUID,          // Hardcoded fixed user id
            'PSU-IP-Address': ipAddress
        };
    }

    /**
     * Fetches the list of accounts.
     */
    async getAccounts(clientId) {
        try {
            const response = await axios.get(`${BRD_API_BASE_URL}/accounts`, {
                headers: this.getCommonHeaders(clientId)
            });
            return response.data.accounts || [];
        } catch (error) {
            console.error('Error in BRD getAccounts:', error?.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Fetches the balance of an account.
     */
    async getBalances(clientId, accountId) {
        try {
            const response = await axios.get(`${BRD_API_BASE_URL}/accounts/${accountId}/balances`, {
                headers: this.getCommonHeaders(clientId)
            });
            return response.data;
        } catch (error) {
            console.error(`Error in BRD getBalances for account ${accountId}:`, error?.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Fetches transactions.
     * BRD Sandbox max recordsPerPage = 10, sandbox has ~3 transactions total.
     */
    async getTransactions(clientId, accountId, dateFrom = '2018-01-01', bookingStatus = 'both') {
        try {
            const response = await axios.get(`${BRD_API_BASE_URL}/accounts/${accountId}/transactions`, {
                headers: this.getCommonHeaders(clientId),
                params: {
                    dateFrom,
                    bookingStatus,
                    recordsPerPage: 10,
                    pageNumber: 1
                }
            });
            return response.data.transactions || { booked: [], pending: [] };
        } catch (error) {
            console.error(`Error in BRD getTransactions for account ${accountId}:`, error?.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new BrdService();
