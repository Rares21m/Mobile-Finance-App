/**
 * @fileoverview Budget context for the Novence app.
 * Manages:
 *  1. Monthly budget limits per spending category (persisted in AsyncStorage)
 *  2. AI-suggested budgets based on onboarding profile (50/30/20 rule)
 *  3. Event budgets with custom date ranges (e.g. vacations, weekends)
 *
 * Spending is computed in real-time from the current month's transactions.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState } from
"react";
import api from "../services/api";
import {
  CATEGORIES,
  categorizeTransaction,
  explainTotals,
  filterByPeriod,
  getSourceBreakdown,
  getCategoryBreakdown } from
"../utils/categoryUtils";
import { useAuth } from "./AuthContext";
import { useBankData } from "./BankContext";

const BUDGET_STORAGE_KEY = "budget_limits_v1";
const EVENT_BUDGETS_KEY = "event_budgets_v1";

const BudgetContext = createContext(null);





const NEEDS_CATEGORIES = [
"food",
"transport",
"utilities",
"housing",
"health"];

const WANTS_CATEGORIES = ["shopping", "entertainment", "other"];


const INCOME_MIDPOINTS = {
  under_1500: 1200,
  "1500_3000": 2250,
  "3000_6000": 4500,
  over_6000: 8000
};

export function BudgetProvider({ children }) {
  const { transactions } = useBankData();
  const { token } = useAuth();



  const [limits, setLimits] = useState({});
  const [loaded, setLoaded] = useState(false);


  const [eventBudgets, setEventBudgets] = useState([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);


  useEffect(() => {
    AsyncStorage.getItem(BUDGET_STORAGE_KEY).
    then((raw) => {
      if (raw) {
        try {
          setLimits(JSON.parse(raw));
        } catch {

        }
      }
    }).
    finally(() => setLoaded(true));
  }, []);


  useEffect(() => {
    AsyncStorage.getItem(EVENT_BUDGETS_KEY).
    then((raw) => {
      if (raw) {
        try {
          setEventBudgets(JSON.parse(raw));
        } catch {

        }
      }
    }).
    finally(() => setEventsLoaded(true));
  }, []);


  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(limits)).catch(
        () => {}
      );
    }
  }, [limits, loaded]);


  useEffect(() => {
    if (eventsLoaded) {
      AsyncStorage.setItem(
        EVENT_BUDGETS_KEY,
        JSON.stringify(eventBudgets)
      ).catch(() => {});
    }
  }, [eventBudgets, eventsLoaded]);


  useEffect(() => {
    if (!token) return;
    api.
    get("/budgets/limits").
    then((res) => {
      if (res.data?.limits) setLimits(res.data.limits);
    }).
    catch(() => {});
  }, [token]);


  useEffect(() => {
    if (!token) return;
    api.
    get("/budgets/events").
    then((res) => {
      if (res.data?.events) setEventBudgets(res.data.events);
    }).
    catch(() => {});
  }, [token]);


  useEffect(() => {
    if (!token || !loaded) return;
    const timer = setTimeout(() => {
      api.put("/budgets/limits", { limits }).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [limits, token, loaded]);


  const setBudgetLimit = useCallback((categoryKey, amount) => {
    setLimits((prev) => {
      const num = parseFloat(amount);
      if (!amount || isNaN(num) || num <= 0) {

        const next = { ...prev };
        delete next[categoryKey];
        return next;
      }
      return { ...prev, [categoryKey]: Math.round(num * 100) / 100 };
    });
  }, []);


  const currentMonthSpending = useMemo(() => {
    const currentMonthTx = filterByPeriod(transactions, 0);
    const breakdown = getCategoryBreakdown(currentMonthTx);
    const result = {};
    breakdown.forEach((cat) => {
      result[cat.key] = cat.total;
    });
    return result;
  }, [transactions]);


  const totalBudgeted = useMemo(
    () => Object.values(limits).reduce((s, v) => s + v, 0),
    [limits]
  );


  const totalSpentOnBudgeted = useMemo(
    () =>
    Object.keys(limits).reduce(
      (s, key) => s + (currentMonthSpending[key] || 0),
      0
    ),
    [limits, currentMonthSpending]
  );






  const getBudgetStatus = useCallback(
    (categoryKey) => {
      const spent = currentMonthSpending[categoryKey] || 0;
      const limit = limits[categoryKey] ?? null;
      if (!limit)
      return { spent, limit: null, percentage: null, status: "no_budget" };
      const rawPct = spent / limit * 100;
      const percentage = Math.round(Math.min(rawPct, 999));
      let status = "ok";
      if (rawPct >= 100) status = "over";else
      if (rawPct >= 75) status = "warning";
      return { spent, limit, percentage, status };
    },
    [currentMonthSpending, limits]
  );





  const getBudgetSummary = useCallback(() => {
    return CATEGORIES.map((cat) => {
      const { spent, limit, percentage, status } = getBudgetStatus(cat.key);
      return { key: cat.key, limit, spent, percentage, status };
    }).filter((b) => b.limit !== null);
  }, [getBudgetStatus]);

  const getBudgetExplainability = useCallback(
    (categoryKey = null) => {
      const currentMonthTx = filterByPeriod(transactions, 0);
      const filtered = categoryKey ?
      currentMonthTx.filter((tx) => categorizeTransaction(tx).key === categoryKey) :
      currentMonthTx;

      const totals = explainTotals(filtered);
      const sourceBreakdown = getSourceBreakdown(filtered);
      const limit = categoryKey ? limits[categoryKey] ?? null : null;
      const spent =
      categoryKey && limit !== null ?
      currentMonthSpending[categoryKey] || 0 :
      totals.expenses;

      return {
        categoryKey,
        spent: Math.round(spent * 100) / 100,
        limit,
        remaining:
        limit === null ? null : Math.round(Math.max(limit - spent, 0) * 100) / 100,
        formula:
        limit === null ?
        "total_expenses" :
        "remaining = limit - spent",
        transactionCount: totals.transactionCount,
        sourceBreakdown
      };
    },
    [transactions, currentMonthSpending, limits]
  );











  const getSuggestedBudgets = useCallback((profile) => {
    if (!profile?.incomeRange) return [];

    const income = INCOME_MIDPOINTS[profile.incomeRange] || 2250;
    const needsBudget = income * 0.5;
    const wantsBudget = income * 0.3;


    const priorities = profile.priorityCategories || [];


    const needsCats = priorities.filter((k) => NEEDS_CATEGORIES.includes(k));
    const wantsCats = priorities.filter((k) => WANTS_CATEGORIES.includes(k));


    const finalNeeds = needsCats.length > 0 ? needsCats : ["food", "transport"];
    const finalWants = wantsCats.length > 0 ? wantsCats : [];

    const suggestions = [];


    if (finalNeeds.length > 0) {
      const perNeed = Math.round(needsBudget / finalNeeds.length * 100) / 100;
      finalNeeds.forEach((key) => {
        suggestions.push({ key, suggestedLimit: perNeed, type: "need" });
      });
    }


    if (finalWants.length > 0) {
      const perWant = Math.round(wantsBudget / finalWants.length * 100) / 100;
      finalWants.forEach((key) => {
        suggestions.push({ key, suggestedLimit: perWant, type: "want" });
      });
    }

    return suggestions;
  }, []);




  const applySuggestedBudgets = useCallback((suggestions) => {
    setLimits((prev) => {
      const next = { ...prev };
      suggestions.forEach(({ key, suggestedLimit }) => {
        next[key] = suggestedLimit;
      });
      return next;
    });
  }, []);





  const getSmartWeightSuggestions = useCallback(() => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const expenses = transactions.filter((tx) => {
      const amount = parseFloat(tx.transactionAmount?.amount || 0);
      if (amount >= 0) return false;
      const date = new Date(tx.bookingDate || tx.valueDate || "");
      return date >= threeMonthsAgo;
    });

    if (expenses.length < 3) return [];

    const SKIP_KEYS = new Set(["salary", "transfer"]);
    const groups = {};
    let grandTotal = 0;

    for (const tx of expenses) {
      const cat = categorizeTransaction(tx);
      if (SKIP_KEYS.has(cat.key)) continue;
      const amount = Math.abs(parseFloat(tx.transactionAmount?.amount || 0));
      grandTotal += amount;
      groups[cat.key] = (groups[cat.key] || 0) + amount;
    }

    if (grandTotal === 0) return [];

    return Object.entries(groups).
    map(([key, total]) => ({
      key,
      percentage: Math.round(total / grandTotal * 100),
      suggestedLimit: Math.round(total / 3)
    })).
    filter((s) => s.percentage >= 2).
    sort((a, b) => b.suggestedLimit - a.suggestedLimit);
  }, [transactions]);









  const addEventBudget = useCallback(
    async (budget) => {
      const tempId =
      Date.now().toString() + Math.random().toString(36).slice(2, 7);
      const newBudget = {
        id: tempId,
        name: budget.name,
        totalLimit: parseFloat(budget.totalLimit),
        startDate: budget.startDate,
        endDate: budget.endDate,
        categories: budget.categories || [],
        createdAt: new Date().toISOString()
      };
      setEventBudgets((prev) => [...prev, newBudget]);
      if (token) {
        try {
          const res = await api.post("/budgets/events", {
            name: budget.name,
            totalLimit: budget.totalLimit,
            startDate: budget.startDate,
            endDate: budget.endDate,
            categories: budget.categories || []
          });
          const serverBudget = res.data.event;
          setEventBudgets((prev) =>
          prev.map((eb) => eb.id === tempId ? serverBudget : eb)
          );
          return serverBudget;
        } catch (e) {

        }
      }
      return newBudget;
    },
    [token]
  );




  const updateEventBudget = useCallback(
    (id, data) => {
      setEventBudgets((prev) =>
      prev.map((eb) => eb.id === id ? { ...eb, ...data } : eb)
      );
      if (token) {
        api.put(`/budgets/events/${id}`, data).catch(() => {});
      }
    },
    [token]
  );




  const removeEventBudget = useCallback(
    (id) => {
      setEventBudgets((prev) => prev.filter((eb) => eb.id !== id));
      if (token) {
        api.delete(`/budgets/events/${id}`).catch(() => {});
      }
    },
    [token]
  );




  const getEventBudgetStatus = useCallback(
    (eventBudget) => {
      const start = new Date(eventBudget.startDate);
      const end = new Date(eventBudget.endDate);
      end.setHours(23, 59, 59, 999);

      const relevantTx = transactions.filter((tx) => {
        const d = new Date(tx.bookingDate || tx.valueDate);
        if (d < start || d > end) return false;
        const amount = parseFloat(tx.transactionAmount?.amount || 0);
        if (amount >= 0) return false;


        if (eventBudget.categories && eventBudget.categories.length > 0) {
          const description = [
          tx.remittanceInformationUnstructured || "",
          tx.creditorName || "",
          tx.debtorName || ""].

          join(" ").
          toLowerCase();

          const { categorizeTransaction } = require("../utils/categoryUtils");
          const cat = categorizeTransaction(tx);
          return eventBudget.categories.includes(cat.key);
        }
        return true;
      });

      const spent = relevantTx.reduce(
        (sum, tx) =>
        sum + Math.abs(parseFloat(tx.transactionAmount?.amount || 0)),
        0
      );
      const spentRounded = Math.round(spent * 100) / 100;
      const rawPct =
      eventBudget.totalLimit > 0 ?
      spentRounded / eventBudget.totalLimit * 100 :
      0;
      const percentage = Math.round(Math.min(rawPct, 999));

      const now = new Date();
      let status = "ok";
      if (now > end) status = "expired";else
      if (rawPct >= 100) status = "over";else
      if (rawPct >= 75) status = "warning";else
      if (now >= start) status = "active";else
      status = "upcoming";

      return {
        spent: spentRounded,
        limit: eventBudget.totalLimit,
        percentage,
        status,
        daysLeft:
        now <= end ? Math.max(0, Math.ceil((end - now) / 86400000)) : 0
      };
    },
    [transactions]
  );




  const getActiveEventBudgets = useCallback(() => {
    const now = new Date();
    return eventBudgets.filter((eb) => {
      const start = new Date(eb.startDate);
      const end = new Date(eb.endDate);
      end.setHours(23, 59, 59, 999);
      return now >= start && now <= end;
    });
  }, [eventBudgets]);



  const value = useMemo(
    () => ({

      limits,
      loaded,
      setBudgetLimit,
      currentMonthSpending,
      totalBudgeted,
      totalSpentOnBudgeted,
      getBudgetStatus,
      getBudgetSummary,
      getBudgetExplainability,

      getSuggestedBudgets,
      applySuggestedBudgets,
      getSmartWeightSuggestions,
      eventBudgets,
      eventsLoaded,
      addEventBudget,
      updateEventBudget,
      removeEventBudget,
      getEventBudgetStatus,
      getActiveEventBudgets
    }),
    [
    limits,
    loaded,
    setBudgetLimit,
    currentMonthSpending,
    totalBudgeted,
    totalSpentOnBudgeted,
    getBudgetStatus,
    getBudgetSummary,
    getBudgetExplainability,
    getSuggestedBudgets,
    applySuggestedBudgets,
    getSmartWeightSuggestions,
    eventBudgets,
    eventsLoaded,
    addEventBudget,
    updateEventBudget,
    removeEventBudget,
    getEventBudgetStatus,
    getActiveEventBudgets]

  );

  return (
    <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>);

}

export const useBudget = () => {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error("useBudget must be used inside BudgetProvider");
  return ctx;
};