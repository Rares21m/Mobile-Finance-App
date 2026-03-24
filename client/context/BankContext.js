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
  useState } from
"react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const BankContext = createContext(null);


function isBtSessionExpired(err) {
  return (
    err?.response?.status === 401 &&
    err?.response?.data?.error === "BT_SESSION_EXPIRED");

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
  const isRefreshing = useRef(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [trustByConnection, setTrustByConnection] = useState({});


  const transactions = useMemo(() => {
    const withOverrides = bankTxs.map((tx) => {
      const override = categoryOverrides[tx.transactionId];
      return override ? { ...tx, category: override } : tx;
    });
    return [...withOverrides, ...manualTxsRaw];
  }, [bankTxs, manualTxsRaw, categoryOverrides]);


  useEffect(() => {
    if (token) {
      refreshAllData();
      refreshManualData();
    } else {

      setConnections([]);
      setAccounts([]);
      setBankTxs([]);
      setManualTxsRaw([]);
      setCategoryOverrides({});
      setTrustByConnection({});
    }
  }, [token]);

  async function refreshAllData() {
    if (!token) return;
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    setSessionExpired(false);

    setLoading(true);
    try {


      const btRes = await api.
      get("/bt/connections").
      catch(() => ({ data: { connections: [] } }));

      const savedConnections = btRes.data.connections || [];

      if (__DEV__)
      console.log(
        `Refreshing bank data for ${savedConnections.length} connection(s)…`
      );


      for (const conn of savedConnections) {
        try {
          await addConnection(conn.id, conn.bankName);
        } catch (connErr) {
          if (isBtSessionExpired(connErr)) {

            setConnections((prev) => prev.filter((c) => c.id !== conn.id));
            setSessionExpired(true);
            setTrustByConnection((prev) => ({
              ...prev,
              [conn.id]: {
                healthState: "expired",
                dataMayBeOutdated: true,
                lastSyncAt: prev[conn.id]?.lastSyncAt || null,
                bankName: conn.bankName
              }
            }));
          } else if (connErr?.response?.status === 401) {

            if (__DEV__)
            console.warn(
              `Connection ${conn.id} returned 401 but didn't match BT_SESSION_EXPIRED. Payload:`,
              connErr.response?.data
            );
            setConnections((prev) => prev.filter((c) => c.id !== conn.id));
            setSessionExpired(true);
            setTrustByConnection((prev) => ({
              ...prev,
              [conn.id]: {
                healthState: "expired",
                dataMayBeOutdated: true,
                lastSyncAt: prev[conn.id]?.lastSyncAt || null,
                bankName: conn.bankName
              }
            }));
          } else {
            if (__DEV__)
            console.error(
              "Error loading connection:",
              conn.id,
              connErr.response?.data || connErr.message
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
      dateFrom.setDate(today.getDate() - 89);
      const dateFromStr = dateFrom.toISOString().slice(0, 10);


      let endpoint = "";
      if (bankName.toLowerCase() === "brd") {
        endpoint = `/brd/connection-data/${connectionId}`;
      } else {
        endpoint = `/bt/connection-data/${connectionId}`;
      }


      const res = await api.get(
        `${endpoint}?dateFrom=${dateFromStr}&bookingStatus=booked`
      );

      const accountsWithBalances = (res.data.accounts || []).map((acc) => ({
        ...acc,
        connectionId
      }));
      const rawTransactions = res.data.transactions || [];
      const trustMeta = {
        lastSyncAt: res.data?.metadata?.lastSyncAt || new Date().toISOString(),
        healthState: res.data?.metadata?.healthState || "connected",
        dataMayBeOutdated: Boolean(res.data?.metadata?.dataMayBeOutdated),
        bankName
      };


      if (__DEV__ && rawTransactions.length > 0) {
        const allKeys = new Set();
        rawTransactions.forEach((tx) =>
        Object.keys(tx).forEach((k) => allKeys.add(k))
        );
        console.log(`BT: ${rawTransactions.length} transactions, keys:`, [
        ...allKeys]
        );
      }


      const userIban = accountsWithBalances[0]?.iban;

      const realTransactions = rawTransactions.map((tx) => {
        const amount = parseFloat(tx.transactionAmount?.amount || tx.amount || 0);
        const indicator = tx.creditDebitIndicator;

        let isDebit = false;
        if (
        indicator === "DBIT" ||
        indicator === "Debit" ||
        indicator === "debit")
        {
          isDebit = true;
        } else if (amount < 0) {
          isDebit = true;
        } else if (tx.debtorAccount?.iban === userIban || tx.debtorAccount?.iban) {
          isDebit = true;
        } else if (
        tx.proprietaryBankTransactionCode === "DEBIT" ||
        tx.bankTransactionCode === "PMNT-ICDT-ESCT" || tx.type === "debit")
        {
          isDebit = true;
        }

        const finalAmountStr = isDebit ?
        (-Math.abs(amount)).toString() :
        Math.abs(amount).toString();

        return {
          ...tx,
          transactionAmount: {
            ...tx.transactionAmount,
            amount: finalAmountStr,
            currency: tx.transactionAmount?.currency || tx.currency || "RON"
          },
          creditDebitIndicator: isDebit ? "DBIT" : "CRDT",
          accountId: accountsWithBalances[0]?.resourceId,
          connectionId,
          sourceLabel: tx.sourceLabel || "synced",
          lastUpdatedAt: tx.lastUpdatedAt || trustMeta.lastSyncAt
        };
      });


      const allTransactions = realTransactions;

      if (__DEV__) {
        const totalExpenses = allTransactions.
        filter((tx) => parseFloat(tx.transactionAmount?.amount) < 0).
        reduce(
          (s, tx) => s + Math.abs(parseFloat(tx.transactionAmount.amount)),
          0
        );
        const totalIncome = allTransactions.
        filter((tx) => parseFloat(tx.transactionAmount?.amount) > 0).
        reduce((s, tx) => s + parseFloat(tx.transactionAmount.amount), 0);
        console.log(
          `[${bankName}] Transactions: ${allTransactions.length} total | Income: ${totalIncome.toFixed(2)} | Expenses: ${totalExpenses.toFixed(2)} | Net: ${(totalIncome - totalExpenses).toFixed(2)} RON`
        );
      }

      setConnections((prev) => {


        const filtered =
        bankName.toLowerCase() === "brd" ?
        prev.filter((c) => c.bankName !== "BRD") :
        prev.filter((c) => c.id !== connectionId);
        return [...filtered, { id: connectionId, bankName, status: "active" }];
      });

      setTrustByConnection((prev) => {
        if (bankName.toLowerCase() === "brd") {
          const staleBrdIds = connections.
          filter((c) => c.bankName === "BRD").
          map((c) => c.id);
          const next = { ...prev };
          staleBrdIds.forEach((id) => {
            delete next[id];
          });
          next[connectionId] = trustMeta;
          return next;
        }

        return {
          ...prev,
          [connectionId]: trustMeta
        };
      });


      setSessionExpired(false);

      setBankTxs((prev) => {
        if (bankName.toLowerCase() === "brd") {

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
      const code = err?.response?.data?.error;
      if (
      code === "BT_TIMEOUT" ||
      code === "BRD_TIMEOUT" ||
      code === "BANKING_PROVIDER_DEGRADED" ||
      code === "BT_RATE_LIMITED" ||
      code === "BRD_RATE_LIMITED")
      {
        setTrustByConnection((prev) => ({
          ...prev,
          [connectionId]: {
            lastSyncAt: prev[connectionId]?.lastSyncAt || null,
            healthState: "degraded",
            dataMayBeOutdated: true,
            bankName
          }
        }));
      }


      if (!isBtSessionExpired(err)) {
        if (__DEV__)
        console.error(
          "Error adding connection (details):",
          err.response?.data || err.message
        );
      }
      throw err;
    }
  }

  async function removeConnection(bankName) {
    await api.delete(`/bt/connections/${bankName}`);

    const removedIds = connections.
    filter((c) => c.bankName === bankName.toUpperCase()).
    map((c) => c.id);

    setConnections((prev) =>
    prev.filter((c) => c.bankName !== bankName.toUpperCase())
    );
    setAccounts((prev) =>
    prev.filter((acc) => !removedIds.includes(acc.connectionId))
    );
    setBankTxs((prev) =>
    prev.filter((tx) => !removedIds.includes(tx.connectionId))
    );
    setTrustByConnection((prev) => {
      const next = { ...prev };
      removedIds.forEach((id) => {
        delete next[id];
      });
      return next;
    });
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
    prev.map((tx) => tx.manualId === id ? updated : tx)
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


    return accounts.reduce((total, account) => {
      const availableBalance = account.balances?.find(
        (b) =>
        b.balanceType === "interimAvailable" || b.balanceType === "expected"
      );
      const balance = availableBalance || account.balances?.[0];
      const amount = parseFloat(balance?.balanceAmount?.amount || 0);
      return total + amount;
    }, 0);
  }

  function getRecentTransactions(limit = 10) {
    return transactions.
    sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate)).
    slice(0, limit);
  }

  return (
    <BankContext.Provider
      value={{
        connections,
        accounts,
        transactions,
        loading,
        sessionExpired,
        trustByConnection,
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
        removeCategoryOverride
      }}>
      
      {children}
    </BankContext.Provider>);

}