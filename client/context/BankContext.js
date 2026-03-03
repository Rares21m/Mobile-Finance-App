/**
 * @fileoverview Bank data context and provider for the Novence app.
 * Manages BT Open Banking connections, accounts, transaction data,
 * and provides helper functions (total balance, recent transactions).
 * In __DEV__ mode, mock expense transactions are injected for demo purposes.
 */

import { createContext, useContext, useEffect, useRef, useState } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const BankContext = createContext(null);

/** Checks if an Axios error is a BT session expiry (HTTP 401 with BT_SESSION_EXPIRED) */
function isBtSessionExpired(err) {
    return err?.response?.status === 401 &&
        err?.response?.data?.error === "BT_SESSION_EXPIRED";
}

// Generate realistic mock expense transactions
// Target: 15,501.55 (income) - 15,016.00 (expenses) = 485.55 RON (balance)
function generateMockExpenses(userIban) {
    const today = new Date();
    const expenses = [];

    const createTx = (daysAgo, amount, creditorName, description) => {
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);
        const dateStr = date.toISOString().split('T')[0];
        return {
            transactionId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            debtorName: "Dan Popescu",
            debtorAccount: { iban: userIban },
            creditorName,
            creditorAccount: { iban: "RO98BTRLRONCRT0MOCK" + Math.random().toString(36).substr(2, 6).toUpperCase() },
            transactionAmount: { currency: "RON", amount: (-amount).toString() },
            bookingDate: dateStr,
            valueDate: dateStr,
            remittanceInformationUnstructured: description
        };
    };

    // ── Housing: 2,500 RON ──────────────────────────────────────────────────
    expenses.push(createTx(5, 2500, "Administrator Imobil", "Chirie lunara ianuarie 2026"));

    // ── Utilities: 1,400 RON ─────────────────────────────────────────────────
    expenses.push(createTx(8, 520, "ENEL Energie", "Factura curent electric - decembrie"));
    expenses.push(createTx(12, 230, "ENGIE Romania", "Factura gaz natural - decembrie"));
    expenses.push(createTx(15, 280, "Apa Nova Bucuresti", "Factura apa - decembrie"));
    expenses.push(createTx(18, 75, "DIGI Romania", "Abonament internet & TV - ianuarie"));
    expenses.push(createTx(20, 65, "Orange Romania", "Abonament telefon mobil - ianuarie"));
    expenses.push(createTx(22, 230, "Administrator Bloc", "Intretinere bloc - decembrie"));
    // Subtotal: 520+230+280+75+65+230 = 1,400 ✓

    // ── Groceries (supermarket): 3,000 RON ───────────────────────────────────
    expenses.push(createTx(1, 380, "Kaufland Romania", "Cumparaturi alimentare"));
    expenses.push(createTx(3, 195, "Mega Image", "Cumparaturi zilnice"));
    expenses.push(createTx(4, 160, "Lidl Romania", "Produse alimentare"));
    expenses.push(createTx(6, 310, "Carrefour", "Cumparaturi saptamanale"));
    expenses.push(createTx(7, 145, "Profi", "Cumparaturi alimentare"));
    expenses.push(createTx(9, 420, "Kaufland Romania", "Cumparaturi weekend"));
    expenses.push(createTx(11, 195, "Mega Image", "Produse alimentare"));
    expenses.push(createTx(13, 320, "Auchan", "Cumparaturi lunare"));
    expenses.push(createTx(14, 175, "Lidl Romania", "Produse alimentare"));
    expenses.push(createTx(16, 130, "La Doi Pasi", "Cumparaturi zilnice"));
    expenses.push(createTx(19, 380, "Selgros", "Cumparaturi angro"));
    expenses.push(createTx(21, 190, "Penny Market", "Produse alimentare"));
    // Subtotal: 380+195+160+310+145+420+195+320+175+130+380+190 = 3,000 ✓

    // ── Restaurants: 1,200 RON ───────────────────────────────────────────────
    expenses.push(createTx(2, 245, "Restaurant Caru cu Bere", "Masa in oras"));
    expenses.push(createTx(5, 120, "Pizza Hut", "Comanda livrare"));
    expenses.push(createTx(10, 95, "McDonald's", "Fast food"));
    expenses.push(createTx(17, 285, "Trattoria Il Calcio", "Cina restaurant"));
    expenses.push(createTx(23, 155, "KFC Romania", "Comanda livrare"));
    expenses.push(createTx(25, 120, "Starbucks", "Cafea & snacks"));
    expenses.push(createTx(28, 180, "Restaurant Hanu Berarilor", "Masa romana"));
    // Subtotal: 245+120+95+285+155+120+180 = 1,200 ✓

    // ── Glovo / Tazz: 500 RON ────────────────────────────────────────────────
    expenses.push(createTx(4, 110, "Glovo", "Livrare mancare - Spartan"));
    expenses.push(createTx(8, 120, "Tazz by eMAG", "Livrare mancare - City Grill"));
    expenses.push(createTx(15, 95, "Bolt Food", "Livrare pizza"));
    expenses.push(createTx(24, 105, "Glovo", "Livrare mancare - Dristor Kebab"));
    expenses.push(createTx(30, 70, "Tazz by eMAG", "Livrare sushi"));
    // Subtotal: 110+120+95+105+70 = 500 ✓

    // ── Transport: 2,000 RON ─────────────────────────────────────────────────
    expenses.push(createTx(3, 240, "Petrom", "Alimentare benzina"));
    expenses.push(createTx(7, 265, "OMV Romania", "Alimentare combustibil"));
    expenses.push(createTx(11, 120, "Bolt", "Curse taxi"));
    expenses.push(createTx(14, 245, "Rompetrol", "Alimentare benzina"));
    expenses.push(createTx(18, 90, "Uber", "Curse in oras"));
    expenses.push(createTx(21, 220, "MOL Romania", "Alimentare combustibil"));
    expenses.push(createTx(25, 240, "Petrom", "Alimentare benzina"));
    expenses.push(createTx(28, 110, "Metrorex", "Abonament lunar metrou"));
    expenses.push(createTx(30, 85, "Bolt", "Curse scurte"));
    expenses.push(createTx(35, 185, "OMV Romania", "Alimentare + spalatorie"));
    expenses.push(createTx(40, 120, "Rompetrol", "Alimentare combustibil"));
    expenses.push(createTx(45, 80, "Parcare Q-Park", "Parcare lunara"));
    // Subtotal: 240+265+120+245+90+220+240+110+85+185+120+80 = 2,000 ✓

    // ── Shopping: 1,000 RON ──────────────────────────────────────────────────
    expenses.push(createTx(6, 350, "eMAG", "Cumparaturi electronice"));
    expenses.push(createTx(12, 230, "Decathlon", "Articole sport"));
    expenses.push(createTx(19, 175, "H&M Romania", "Haine & accesorii"));
    expenses.push(createTx(26, 145, "Zara", "Imbracaminte"));
    expenses.push(createTx(32, 100, "Pepco", "Articole diverse"));
    // Subtotal: 350+230+175+145+100 = 1,000 ✓

    // ── Entertainment: 400 RON ───────────────────────────────────────────────
    expenses.push(createTx(10, 39.90, "Netflix", "Abonament streaming"));
    expenses.push(createTx(15, 22.50, "Spotify", "Abonament muzica"));
    expenses.push(createTx(20, 110, "Cinema City", "Bilete film"));
    expenses.push(createTx(27, 145, "Teatru Național", "Bilete teatru"));
    expenses.push(createTx(34, 42.60, "HBO Max", "Abonament streaming"));
    expenses.push(createTx(48, 40, "YouTube Premium", "Abonament"));
    // Subtotal: 39.90+22.50+110+145+42.60+40 = 400 ✓

    // ── Health: 500 RON ──────────────────────────────────────────────────────
    expenses.push(createTx(9, 190, "Farmacia Catena", "Medicamente"));
    expenses.push(createTx(16, 145, "Farmacia Sensiblu", "Retete medicale"));
    expenses.push(createTx(29, 95, "Dr Max Pharma", "Medicamente OTC"));
    expenses.push(createTx(43, 70, "Clinica Medicover", "Consultatie"));
    // Subtotal: 190+145+95+70 = 500 ✓

    // ── Other: 2,516 RON ─────────────────────────────────────────────────────
    expenses.push(createTx(13, 380, "Asigurare RCA", "Asigurare auto"));
    expenses.push(createTx(24, 120, "Librarie Carturesti", "Carti & papetarie"));
    expenses.push(createTx(36, 90, "PetShop", "Hrana animale"));
    expenses.push(createTx(47, 150, "Spalatorie", "Curatenie haine"));
    expenses.push(createTx(52, 110, "Frizerie", "Tunsoare & barbierit"));
    expenses.push(createTx(39, 70, "Fan Courier", "Servicii curierat"));
    expenses.push(createTx(31, 190, "Service auto", "Revizie periodica"));
    expenses.push(createTx(37, 145, "Impozite locale", "Taxe & impozite"));
    expenses.push(createTx(42, 220, "Cadouri", "Cadouri familie & prieteni"));
    expenses.push(createTx(54, 180, "Abonament sala", "Fitness & sport"));
    expenses.push(createTx(57, 861, "Diverse", "Cheltuieli diverse"));
    // Subtotal: 380+120+90+150+110+70+190+145+220+180+861 = 2,516 ✓

    // TOTAL: 2,500+1,400+3,000+1,200+500+2,000+1,000+400+500+2,516 = 15,016 ✓

    if (__DEV__) {
        const totalExpenses = expenses.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.transactionAmount.amount)), 0);
        console.log(`Mock expenses total: ${totalExpenses.toFixed(2)} RON (target: 15016.00)`);
    }

    return expenses;
}

export function useBankData() {
    const context = useContext(BankContext);
    if (!context) throw new Error("useBankData must be used within BankProvider");
    return context;
}

export function BankProvider({ children }) {
    const { token } = useAuth();
    const [connections, setConnections] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const isRefreshing = useRef(false); // Guard against concurrent refresh calls
    const [sessionExpired, setSessionExpired] = useState(false); // BT session needs reconnect

    // Refresh data on login/logout
    useEffect(() => {
        if (token) {
            refreshAllData();
        } else {
            // Clear data on logout
            setConnections([]);
            setAccounts([]);
            setTransactions([]);
        }
    }, [token]);

    async function refreshAllData() {
        if (!token) return;
        if (isRefreshing.current) return; // Prevent concurrent calls
        isRefreshing.current = true;
        setSessionExpired(false);

        setLoading(true);
        try {
            // Fetch all active connections saved in the DB for this user.
            // /bt/connections queries BankConnection table for ALL banks (BT + BRD), not just BT.
            const btRes = await api.get("/bt/connections").catch(() => ({ data: { connections: [] } }));

            const savedConnections = btRes.data.connections || [];

            if (__DEV__) console.log(`Refreshing bank data for ${savedConnections.length} connection(s)…`);

            // Re-load accounts + transactions for each connection
            for (const conn of savedConnections) {
                try {
                    await addConnection(conn.id, conn.bankName);
                } catch (connErr) {
                    if (isBtSessionExpired(connErr)) {
                        // Connection expired — remove it from state, prompt reconnect
                        setConnections(prev => prev.filter(c => c.id !== conn.id));
                        setSessionExpired(true);
                    } else if (connErr?.response?.status === 401) {
                        // Fallback: server returned 401 but maybe payload is different
                        if (__DEV__) console.warn(`Connection ${conn.id} returned 401 but didn't match BT_SESSION_EXPIRED. Payload:`, connErr.response?.data);
                        setConnections(prev => prev.filter(c => c.id !== conn.id));
                        setSessionExpired(true);
                    } else {
                        if (__DEV__) console.error("Error loading connection:", conn.id, connErr.response?.data || connErr.message);
                    }
                }
            }
        } catch (err) {
            if (__DEV__) console.error("Error refreshing bank data:", err);
        } finally {
            setLoading(false);
            isRefreshing.current = false;
        }
    }

    async function addConnection(connectionId, bankName = "BT") {
        try {
            const today = new Date();
            const dateFrom = new Date(today);
            dateFrom.setDate(today.getDate() - 89); // Max 90 days
            const dateFromStr = dateFrom.toISOString().slice(0, 10);

            // Determine correct endpoint based on bankName (lowercase)
            const endpoint = bankName.toLowerCase() === 'brd' ? `/brd/connection-data/${connectionId}` : `/bt/connection-data/${connectionId}`;

            // Single server call: accounts + balances + transactions
            const res = await api.get(
                `${endpoint}?dateFrom=${dateFromStr}&bookingStatus=booked`
            );

            const accountsWithBalances = (res.data.accounts || []).map(acc => ({
                ...acc,
                connectionId,
            }));
            const rawTransactions = res.data.transactions || [];

            // Debug: log transaction info (dev only)
            if (__DEV__ && rawTransactions.length > 0) {
                const allKeys = new Set();
                rawTransactions.forEach(tx => Object.keys(tx).forEach(k => allKeys.add(k)));
                console.log(`BT: ${rawTransactions.length} transactions, keys:`, [...allKeys]);
            }

            // Normalize debit/credit — BT Sandbox returns all amounts positive
            const userIban = accountsWithBalances[0]?.iban;

            const realTransactions = rawTransactions.map(tx => {
                const amount = parseFloat(tx.transactionAmount?.amount || 0);
                const indicator = tx.creditDebitIndicator;

                let isDebit = false;
                if (indicator === "DBIT" || indicator === "Debit" || indicator === "debit") {
                    isDebit = true;
                } else if (amount < 0) {
                    isDebit = true;
                } else if (tx.debtorAccount?.iban === userIban) {
                    isDebit = true;
                } else if (tx.creditorAccount?.iban === userIban) {
                    isDebit = false;
                } else if (tx.proprietaryBankTransactionCode === "DEBIT" ||
                    tx.bankTransactionCode === "PMNT-ICDT-ESCT") {
                    isDebit = true;
                }

                return {
                    ...tx,
                    transactionAmount: {
                        ...tx.transactionAmount,
                        amount: isDebit ? (-Math.abs(amount)).toString() : Math.abs(amount).toString(),
                    },
                    accountId: accountsWithBalances[0]?.resourceId,
                    connectionId,
                };
            });

            // In dev mode, inject mock expenses for demo purposes — only for BT (BRD has its own sandbox data)
            let allTransactions = realTransactions;
            if (__DEV__ && userIban && bankName.toLowerCase() === 'bt') {
                const mockExpenses = generateMockExpenses(userIban);
                allTransactions = [...realTransactions, ...mockExpenses];
            }

            if (__DEV__) {
                const totalExpenses = allTransactions
                    .filter(tx => parseFloat(tx.transactionAmount?.amount) < 0)
                    .reduce((s, tx) => s + Math.abs(parseFloat(tx.transactionAmount.amount)), 0);
                console.log(`Mock + real expenses total: ${totalExpenses.toFixed(2)} RON`);
            }

            setConnections(prev => {
                // Dacă este o conexiune BRD nouă, eliminăm toate conexiunile BRD vechi din state
                // (serverul le-a marcat deja ca 'replaced' în DB la initConsent)
                const filtered = bankName.toLowerCase() === 'brd'
                    ? prev.filter(c => c.bankName !== 'BRD')
                    : prev.filter(c => c.id !== connectionId);
                return [...filtered, { id: connectionId, bankName, status: "active" }];
            });

            setTransactions(prev => {
                if (bankName.toLowerCase() === 'brd') {
                    // Eliminăm TOATE tranzacțiile BRD vechi (indiferent de connectionId)
                    const nonBRD = prev.filter(tx => {
                        const conn = connections.find(c => c.id === tx.connectionId);
                        return !conn || conn.bankName !== 'BRD';
                    });
                    return [...nonBRD, ...allTransactions];
                }
                const others = prev.filter(tx => tx.connectionId !== connectionId);
                return [...others, ...allTransactions];
            });

            setAccounts(prev => {
                if (bankName.toLowerCase() === 'brd') {
                    // Eliminăm TOATE conturile BRD vechi (indiferent de connectionId)
                    const nonBRD = prev.filter(acc => {
                        const conn = connections.find(c => c.id === acc.connectionId);
                        return !conn || conn.bankName !== 'BRD';
                    });
                    return [...nonBRD, ...accountsWithBalances];
                }
                const others = prev.filter(acc => acc.connectionId !== connectionId);
                return [...others, ...accountsWithBalances];
            });

            return accountsWithBalances;
        } catch (err) {
            // Re-throw so caller can handle session expiry separately
            if (!isBtSessionExpired(err)) {
                if (__DEV__) console.error("Error adding connection (details):", err.response?.data || err.message);
            }
            throw err;
        }
    }

    function getTotalBalance() {
        return accounts.reduce((total, account) => {
            const availableBalance = account.balances?.find(
                (b) => b.balanceType === "interimAvailable" || b.balanceType === "expected"
            );
            const balance = availableBalance || account.balances?.[0];
            const amount = parseFloat(balance?.balanceAmount?.amount || 0);
            return total + amount;
        }, 0);
    }

    function getRecentTransactions(limit = 10) {
        return transactions
            .sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate))
            .slice(0, limit);
    }

    return (
        <BankContext.Provider
            value={{
                connections,
                accounts,
                transactions,
                loading,
                sessionExpired,
                refreshAllData,
                addConnection,
                getTotalBalance,
                getRecentTransactions,
            }}
        >
            {children}
        </BankContext.Provider>
    );
}
