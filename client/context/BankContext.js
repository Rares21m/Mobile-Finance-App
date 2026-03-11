/**
 * @fileoverview Bank data context and provider for the Novence app.
 * Manages BT Open Banking connections, accounts, transaction data,
 * and provides helper functions (total balance, recent transactions).
 * In __DEV__ mode, mock expense transactions are injected for demo purposes.
 */

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const BankContext = createContext(null);

/** Checks if an Axios error is a BT session expiry (HTTP 401 with BT_SESSION_EXPIRED) */
function isBtSessionExpired(err) {
  return (
    err?.response?.status === 401 &&
    err?.response?.data?.error === "BT_SESSION_EXPIRED"
  );
}

// Helper: creates a single mock transaction
function createMockTx(
  userIban,
  monthsAgo,
  dayOfMonth,
  amount,
  counterpartName,
  description,
  isExpense = true,
) {
  const now = new Date();
  const date = new Date(
    now.getFullYear(),
    now.getMonth() - monthsAgo,
    dayOfMonth,
  );
  // Don't create future dates — clamp to today
  if (date > now) date.setDate(now.getDate());
  const dateStr = date.toISOString().split("T")[0];

  const tx = {
    transactionId: `mock_${dateStr}_${Math.random().toString(36).substr(2, 9)}`,
    transactionAmount: {
      currency: "RON",
      amount: isExpense
        ? (-Math.abs(amount)).toString()
        : Math.abs(amount).toString(),
    },
    bookingDate: dateStr,
    valueDate: dateStr,
    remittanceInformationUnstructured: description,
  };

  if (isExpense) {
    tx.debtorName = "Dan Popescu";
    tx.debtorAccount = { iban: userIban };
    tx.creditorName = counterpartName;
    tx.creditorAccount = {
      iban:
        "RO98BTRLRONCRT0MOCK" +
        Math.random().toString(36).substr(2, 6).toUpperCase(),
    };
  } else {
    tx.creditorName = "Dan Popescu";
    tx.creditorAccount = { iban: userIban };
    tx.debtorName = counterpartName;
    tx.debtorAccount = {
      iban:
        "RO98BTRLRONCRT0MOCK" +
        Math.random().toString(36).substr(2, 6).toUpperCase(),
    };
  }

  return tx;
}

// Generate mock INCOME transactions (salary, freelancing, bonuses)
function generateMockIncome(userIban) {
  const income = [];
  const e = (m, d, amt, name, desc) =>
    income.push(createMockTx(userIban, m, d, amt, name, desc, false));

  // ── Each month gets: salary (5th) + freelancing (18th) ──
  for (let m = 0; m <= 2; m++) {
    e(m, 5, 6500, "SC TechCorp SRL", "Salariu lunar");
    e(m, 18, 1500, "Freelance Client", "Plata proiect freelancing");
  }
  // Bonus in month 1
  e(1, 25, 2000, "SC TechCorp SRL", "Bonus performanta Q4");

  return income;
}

// Generate realistic mock expense transactions spread across 3 months
function generateMockExpenses(userIban) {
  const expenses = [];
  const e = (m, d, amt, name, desc) =>
    expenses.push(createMockTx(userIban, m, d, amt, name, desc, true));

  // ── LUNA CURENTĂ (monthsAgo=0) — spread across real days ─────────────
  // Housing
  e(0, 1, 2500, "Administrator Imobil", "Chirie lunara");
  // Utilities
  e(0, 3, 520, "ENEL Energie", "Factura curent electric");
  e(0, 4, 75, "DIGI Romania", "Abonament internet & TV");
  e(0, 5, 65, "Orange Romania", "Abonament telefon mobil");
  // Groceries — spread across weeks
  e(0, 2, 380, "Kaufland Romania", "Cumparaturi alimentare");
  e(0, 7, 195, "Mega Image", "Cumparaturi zilnice");
  e(0, 12, 160, "Lidl Romania", "Produse alimentare");
  e(0, 18, 210, "Carrefour", "Cumparaturi saptamanale");
  e(0, 24, 145, "Profi", "Produse diverse");
  // Restaurants
  e(0, 6, 245, "Restaurant Caru cu Bere", "Masa in oras");
  e(0, 14, 120, "Pizza Hut", "Comanda livrare");
  e(0, 20, 95, "McDonald's", "Fast food");
  // Delivery
  e(0, 8, 110, "Glovo", "Livrare mancare - Spartan");
  e(0, 16, 85, "Bolt Food", "Livrare pizza");
  // Transport
  e(0, 5, 240, "Petrom", "Alimentare benzina");
  e(0, 15, 120, "Bolt", "Curse taxi");
  e(0, 22, 200, "OMV Romania", "Alimentare combustibil");
  // Entertainment
  e(0, 1, 39.9, "Netflix", "Abonament streaming");
  e(0, 1, 22.5, "Spotify", "Abonament muzica");
  e(0, 10, 110, "Cinema City", "Bilete film");
  // Health
  e(0, 9, 190, "Farmacia Catena", "Medicamente");
  // Shopping
  e(0, 11, 350, "eMAG", "Cumparaturi electronice");
  e(0, 19, 175, "H&M Romania", "Haine & accesorii");

  // ── LUNA TRECUTA (monthsAgo=1) ───────────────────────────────────────
  // Housing
  e(1, 1, 2500, "Administrator Imobil", "Chirie lunara");
  // Utilities
  e(1, 3, 230, "ENGIE Romania", "Factura gaz natural");
  e(1, 5, 280, "Apa Nova Bucuresti", "Factura apa");
  e(1, 6, 75, "DIGI Romania", "Abonament internet & TV");
  e(1, 6, 65, "Orange Romania", "Abonament telefon mobil");
  e(1, 7, 230, "Administrator Bloc", "Intretinere bloc");
  // Groceries
  e(1, 5, 310, "Carrefour", "Cumparaturi saptamanale");
  e(1, 10, 145, "Profi", "Cumparaturi alimentare");
  e(1, 15, 420, "Kaufland Romania", "Cumparaturi weekend");
  e(1, 20, 195, "Mega Image", "Produse alimentare");
  e(1, 25, 320, "Auchan", "Cumparaturi lunare");
  // Restaurants
  e(1, 8, 95, "McDonald's", "Fast food");
  e(1, 17, 285, "Trattoria Il Calcio", "Cina restaurant");
  e(1, 23, 155, "KFC Romania", "Comanda livrare");
  // Delivery
  e(1, 4, 120, "Tazz by eMAG", "Livrare mancare - City Grill");
  e(1, 15, 95, "Bolt Food", "Livrare pizza");
  // Transport
  e(1, 3, 265, "OMV Romania", "Alimentare combustibil");
  e(1, 8, 90, "Uber", "Curse in oras");
  e(1, 14, 245, "Rompetrol", "Alimentare benzina");
  e(1, 22, 220, "MOL Romania", "Alimentare combustibil");
  // Shopping
  e(1, 12, 230, "Decathlon", "Articole sport");
  e(1, 19, 175, "H&M Romania", "Haine & accesorii");
  // Entertainment
  e(1, 10, 39.9, "Netflix", "Abonament streaming");
  e(1, 20, 110, "Cinema City", "Bilete film");
  // Health
  e(1, 12, 145, "Farmacia Sensiblu", "Retete medicale");
  // Other
  e(1, 8, 380, "Asigurare RCA", "Asigurare auto");
  e(1, 15, 120, "Librarie Carturesti", "Carti & papetarie");
  e(1, 22, 190, "Service auto", "Revizie periodica");
  e(1, 28, 220, "Cadouri", "Cadouri familie & prieteni");

  // ── ACUM 2 LUNI (monthsAgo=2) ──────────────────────────────────────
  // Housing
  e(2, 1, 2500, "Administrator Imobil", "Chirie lunara");
  // Utilities
  e(2, 4, 520, "ENEL Energie", "Factura curent electric");
  e(2, 6, 230, "ENGIE Romania", "Factura gaz natural");
  e(2, 7, 280, "Apa Nova Bucuresti", "Factura apa");
  e(2, 8, 230, "Administrator Bloc", "Intretinere bloc");
  // Groceries
  e(2, 5, 175, "Lidl Romania", "Produse alimentare");
  e(2, 9, 130, "La Doi Pasi", "Cumparaturi zilnice");
  e(2, 14, 380, "Selgros", "Cumparaturi angro");
  e(2, 20, 190, "Penny Market", "Produse alimentare");
  // Restaurants
  e(2, 5, 120, "Starbucks", "Cafea & snacks");
  e(2, 14, 180, "Restaurant Hanu Berarilor", "Masa romana");
  e(2, 25, 245, "Restaurant Caru cu Bere", "Masa in oras");
  // Delivery
  e(2, 10, 105, "Glovo", "Livrare mancare - Dristor Kebab");
  e(2, 25, 70, "Tazz by eMAG", "Livrare sushi");
  // Transport
  e(2, 5, 240, "Petrom", "Alimentare benzina");
  e(2, 12, 110, "Metrorex", "Abonament lunar metrou");
  e(2, 18, 85, "Bolt", "Curse scurte");
  e(2, 24, 185, "OMV Romania", "Alimentare + spalatorie");
  e(2, 28, 80, "Parcare Q-Park", "Parcare lunara");
  // Shopping
  e(2, 10, 145, "Zara", "Imbracaminte");
  e(2, 20, 100, "Pepco", "Articole diverse");
  // Entertainment
  e(2, 10, 39.9, "Netflix", "Abonament streaming");
  e(2, 15, 145, "Teatru Național", "Bilete teatru");
  e(2, 20, 42.6, "HBO Max", "Abonament streaming");
  e(2, 25, 40, "YouTube Premium", "Abonament");
  // Health
  e(2, 10, 95, "Dr Max Pharma", "Medicamente OTC");
  e(2, 20, 70, "Clinica Medicover", "Consultatie");
  // Other
  e(2, 6, 90, "PetShop", "Hrana animale");
  e(2, 12, 150, "Spalatorie", "Curatenie haine");
  e(2, 18, 110, "Frizerie", "Tunsoare & barbierit");
  e(2, 24, 70, "Fan Courier", "Servicii curierat");
  e(2, 28, 145, "Impozite locale", "Taxe & impozite");
  e(2, 28, 180, "Abonament sala", "Fitness & sport");

  if (__DEV__) {
    const totalExpenses = expenses.reduce(
      (sum, tx) => sum + Math.abs(parseFloat(tx.transactionAmount.amount)),
      0,
    );
    console.log(`Mock expenses total: ${totalExpenses.toFixed(2)} RON`);
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
  const [bankTxs, setBankTxs] = useState([]);
  const [manualTxsRaw, setManualTxsRaw] = useState([]);
  const [categoryOverrides, setCategoryOverrides] = useState({});
  const [loading, setLoading] = useState(false);
  const isRefreshing = useRef(false); // Guard against concurrent refresh calls
  const [sessionExpired, setSessionExpired] = useState(false); // BT session needs reconnect

  // Merged transactions: bank txs (with overrides applied) + manual txs
  const transactions = useMemo(() => {
    const withOverrides = bankTxs.map((tx) => {
      const override = categoryOverrides[tx.transactionId];
      return override ? { ...tx, category: override } : tx;
    });
    return [...withOverrides, ...manualTxsRaw];
  }, [bankTxs, manualTxsRaw, categoryOverrides]);

  // Refresh data on login/logout
  useEffect(() => {
    if (token) {
      refreshAllData();
      refreshManualData();
    } else {
      // Clear data on logout
      setConnections([]);
      setAccounts([]);
      setBankTxs([]);
      setManualTxsRaw([]);
      setCategoryOverrides({});
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
      const btRes = await api
        .get("/bt/connections")
        .catch(() => ({ data: { connections: [] } }));

      const savedConnections = btRes.data.connections || [];

      if (__DEV__)
        console.log(
          `Refreshing bank data for ${savedConnections.length} connection(s)…`,
        );

      // Re-load accounts + transactions for each connection
      for (const conn of savedConnections) {
        try {
          await addConnection(conn.id, conn.bankName);
        } catch (connErr) {
          if (isBtSessionExpired(connErr)) {
            // Connection expired — remove it from state, prompt reconnect
            setConnections((prev) => prev.filter((c) => c.id !== conn.id));
            setSessionExpired(true);
          } else if (connErr?.response?.status === 401) {
            // Fallback: server returned 401 but maybe payload is different
            if (__DEV__)
              console.warn(
                `Connection ${conn.id} returned 401 but didn't match BT_SESSION_EXPIRED. Payload:`,
                connErr.response?.data,
              );
            setConnections((prev) => prev.filter((c) => c.id !== conn.id));
            setSessionExpired(true);
          } else {
            if (__DEV__)
              console.error(
                "Error loading connection:",
                conn.id,
                connErr.response?.data || connErr.message,
              );
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
      const endpoint =
        bankName.toLowerCase() === "brd"
          ? `/brd/connection-data/${connectionId}`
          : `/bt/connection-data/${connectionId}`;

      // Single server call: accounts + balances + transactions
      const res = await api.get(
        `${endpoint}?dateFrom=${dateFromStr}&bookingStatus=booked`,
      );

      const accountsWithBalances = (res.data.accounts || []).map((acc) => ({
        ...acc,
        connectionId,
      }));
      const rawTransactions = res.data.transactions || [];

      // Debug: log transaction info (dev only)
      if (__DEV__ && rawTransactions.length > 0) {
        const allKeys = new Set();
        rawTransactions.forEach((tx) =>
          Object.keys(tx).forEach((k) => allKeys.add(k)),
        );
        console.log(`BT: ${rawTransactions.length} transactions, keys:`, [
          ...allKeys,
        ]);
      }

      // Normalize debit/credit — BT Sandbox returns all amounts positive
      const userIban = accountsWithBalances[0]?.iban;

      const realTransactions = rawTransactions.map((tx) => {
        const amount = parseFloat(tx.transactionAmount?.amount || 0);
        const indicator = tx.creditDebitIndicator;

        let isDebit = false;
        if (
          indicator === "DBIT" ||
          indicator === "Debit" ||
          indicator === "debit"
        ) {
          isDebit = true;
        } else if (amount < 0) {
          isDebit = true;
        } else if (tx.debtorAccount?.iban === userIban) {
          isDebit = true;
        } else if (tx.creditorAccount?.iban === userIban) {
          isDebit = false;
        } else if (
          tx.proprietaryBankTransactionCode === "DEBIT" ||
          tx.bankTransactionCode === "PMNT-ICDT-ESCT"
        ) {
          isDebit = true;
        }

        return {
          ...tx,
          transactionAmount: {
            ...tx.transactionAmount,
            amount: isDebit
              ? (-Math.abs(amount)).toString()
              : Math.abs(amount).toString(),
          },
          accountId: accountsWithBalances[0]?.resourceId,
          connectionId,
        };
      });

      // In dev mode, inject mock data for demo purposes (both BT and BRD)
      // BT sandbox only has income; BRD sandbox only has 3 static transactions from 2019
      let allTransactions = realTransactions;
      if (__DEV__ && userIban) {
        const mockExpenses = generateMockExpenses(userIban);
        const mockIncome = generateMockIncome(userIban);
        allTransactions = [...realTransactions, ...mockExpenses, ...mockIncome];
      }

      if (__DEV__) {
        const totalExpenses = allTransactions
          .filter((tx) => parseFloat(tx.transactionAmount?.amount) < 0)
          .reduce(
            (s, tx) => s + Math.abs(parseFloat(tx.transactionAmount.amount)),
            0,
          );
        const totalIncome = allTransactions
          .filter((tx) => parseFloat(tx.transactionAmount?.amount) > 0)
          .reduce((s, tx) => s + parseFloat(tx.transactionAmount.amount), 0);
        console.log(
          `[${bankName}] Transactions: ${allTransactions.length} total | Income: ${totalIncome.toFixed(2)} | Expenses: ${totalExpenses.toFixed(2)} | Net: ${(totalIncome - totalExpenses).toFixed(2)} RON`,
        );
      }

      setConnections((prev) => {
        // Dacă este o conexiune BRD nouă, eliminăm toate conexiunile BRD vechi din state
        // (serverul le-a marcat deja ca 'replaced' în DB la initConsent)
        const filtered =
          bankName.toLowerCase() === "brd"
            ? prev.filter((c) => c.bankName !== "BRD")
            : prev.filter((c) => c.id !== connectionId);
        return [...filtered, { id: connectionId, bankName, status: "active" }];
      });

      // Conexiunea a reușit — resetăm flag-ul de sesiune expirată
      setSessionExpired(false);

      setBankTxs((prev) => {
        if (bankName.toLowerCase() === "brd") {
          // Eliminăm TOATE tranzacțiile BRD vechi (indiferent de connectionId)
          const nonBRD = prev.filter((tx) => {
            const conn = connections.find((c) => c.id === tx.connectionId);
            return !conn || conn.bankName !== "BRD";
          });
          return [...nonBRD, ...allTransactions];
        }
        const others = prev.filter((tx) => tx.connectionId !== connectionId);
        return [...others, ...allTransactions];
      });

      setAccounts((prev) => {
        if (bankName.toLowerCase() === "brd") {
          // Eliminăm TOATE conturile BRD vechi (indiferent de connectionId)
          const nonBRD = prev.filter((acc) => {
            const conn = connections.find((c) => c.id === acc.connectionId);
            return !conn || conn.bankName !== "BRD";
          });
          return [...nonBRD, ...accountsWithBalances];
        }
        const others = prev.filter((acc) => acc.connectionId !== connectionId);
        return [...others, ...accountsWithBalances];
      });

      return accountsWithBalances;
    } catch (err) {
      // Re-throw so caller can handle session expiry separately
      if (!isBtSessionExpired(err)) {
        if (__DEV__)
          console.error(
            "Error adding connection (details):",
            err.response?.data || err.message,
          );
      }
      throw err;
    }
  }

  async function removeConnection(bankName) {
    await api.delete(`/bt/connections/${bankName}`);
    // Capture the IDs before removing from state
    const removedIds = connections
      .filter((c) => c.bankName === bankName.toUpperCase())
      .map((c) => c.id);

    setConnections((prev) =>
      prev.filter((c) => c.bankName !== bankName.toUpperCase()),
    );
    setAccounts((prev) =>
      prev.filter((acc) => !removedIds.includes(acc.connectionId)),
    );
    setBankTxs((prev) =>
      prev.filter((tx) => !removedIds.includes(tx.connectionId)),
    );
  }

  async function refreshManualData() {
    if (!token) return;
    try {
      const res = await api.get("/manual");
      setManualTxsRaw(res.data.transactions || []);
      setCategoryOverrides(res.data.categoryOverrides || {});
    } catch (err) {
      if (__DEV__)
        console.warn("Could not load manual transactions:", err.message);
    }
  }

  async function addManualTransaction(data) {
    const res = await api.post("/manual", data);
    const newTx = res.data.transaction;
    setManualTxsRaw((prev) => [newTx, ...prev]);
    return newTx;
  }

  async function updateManualTransaction(id, data) {
    const res = await api.patch(`/manual/${id}`, data);
    const updated = res.data.transaction;
    setManualTxsRaw((prev) =>
      prev.map((tx) => (tx.manualId === id ? updated : tx)),
    );
    return updated;
  }

  async function deleteManualTransaction(id) {
    await api.delete(`/manual/${id}`);
    setManualTxsRaw((prev) => prev.filter((tx) => tx.manualId !== id));
  }

  async function overrideBankTxCategory(transactionId, category) {
    await api.put("/manual/category-override", { transactionId, category });
    setCategoryOverrides((prev) => ({ ...prev, [transactionId]: category }));
  }

  async function removeCategoryOverride(transactionId) {
    await api.delete(`/manual/category-override/${transactionId}`);
    setCategoryOverrides((prev) => {
      const next = { ...prev };
      delete next[transactionId];
      return next;
    });
  }

  function getTotalBalance() {
    // In DEV mode, calculate balance from bank transactions only (mock data isn't reflected in sandbox balances)
    if (__DEV__ && bankTxs.length > 0) {
      return bankTxs.reduce((total, tx) => {
        return total + parseFloat(tx.transactionAmount?.amount || 0);
      }, 0);
    }
    // In production, use the bank-reported balance
    return accounts.reduce((total, account) => {
      const availableBalance = account.balances?.find(
        (b) =>
          b.balanceType === "interimAvailable" || b.balanceType === "expected",
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
        categoryOverrides,
        refreshAllData,
        refreshManualData,
        addConnection,
        removeConnection,
        getTotalBalance,
        getRecentTransactions,
        addManualTransaction,
        updateManualTransaction,
        deleteManualTransaction,
        overrideBankTxCategory,
        removeCategoryOverride,
      }}
    >
      {children}
    </BankContext.Provider>
  );
}
