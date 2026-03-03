/**
 * @fileoverview Budget context for the Novence app.
 * Manages monthly budget limits per spending category.
 * Limits are persisted via AsyncStorage and spending is computed
 * in real-time from the current month's transactions.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    CATEGORIES,
    filterByPeriod,
    getCategoryBreakdown,
} from "../utils/categoryUtils";
import { useBankData } from "./BankContext";

const BUDGET_STORAGE_KEY = "budget_limits_v1";

const BudgetContext = createContext(null);

export function BudgetProvider({ children }) {
  const { transactions } = useBankData();
  /** limits: { food: 500, transport: 300, ... } */
  const [limits, setLimits] = useState({});
  const [loaded, setLoaded] = useState(false);

  // ── Load persisted limits on mount ──────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(BUDGET_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setLimits(JSON.parse(raw));
          } catch {
            // corrupted data — start fresh
          }
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  // ── Persist limits to AsyncStorage whenever they change ─────────────────
  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(limits)).catch(
        () => {},
      );
    }
  }, [limits, loaded]);

  // ── Set or remove a budget limit for a category ─────────────────────────
  const setBudgetLimit = useCallback((categoryKey, amount) => {
    setLimits((prev) => {
      const num = parseFloat(amount);
      if (!amount || isNaN(num) || num <= 0) {
        // Remove limit
        const next = { ...prev };
        delete next[categoryKey];
        return next;
      }
      return { ...prev, [categoryKey]: Math.round(num * 100) / 100 };
    });
  }, []);

  // ── Current-month spending totals per category ───────────────────────────
  const currentMonthSpending = useMemo(() => {
    const currentMonthTx = filterByPeriod(transactions, 0);
    const breakdown = getCategoryBreakdown(currentMonthTx);
    const result = {};
    breakdown.forEach((cat) => {
      result[cat.key] = cat.total;
    });
    return result;
  }, [transactions]);

  // ── Total budgeted amount ────────────────────────────────────────────────
  const totalBudgeted = useMemo(
    () => Object.values(limits).reduce((s, v) => s + v, 0),
    [limits],
  );

  // ── Total spent across budgeted categories ──────────────────────────────
  const totalSpentOnBudgeted = useMemo(
    () =>
      Object.keys(limits).reduce(
        (s, key) => s + (currentMonthSpending[key] || 0),
        0,
      ),
    [limits, currentMonthSpending],
  );

  /**
   * Returns budget status for a single category.
   * @returns {{ spent, limit, percentage, status }}
   *   status: 'no_budget' | 'ok' | 'warning' | 'over'
   */
  const getBudgetStatus = useCallback(
    (categoryKey) => {
      const spent = currentMonthSpending[categoryKey] || 0;
      const limit = limits[categoryKey] ?? null;
      if (!limit)
        return { spent, limit: null, percentage: null, status: "no_budget" };
      const rawPct = (spent / limit) * 100;
      const percentage = Math.round(Math.min(rawPct, 999));
      let status = "ok";
      if (rawPct >= 100) status = "over";
      else if (rawPct >= 75) status = "warning";
      return { spent, limit, percentage, status };
    },
    [currentMonthSpending, limits],
  );

  /**
   * Returns a grouped summary useful for the AI advisor.
   * [{ key, limit, spent, percentage, status }]
   */
  const getBudgetSummary = useCallback(() => {
    return CATEGORIES.map((cat) => {
      const { spent, limit, percentage, status } = getBudgetStatus(cat.key);
      return { key: cat.key, limit, spent, percentage, status };
    }).filter((b) => b.limit !== null);
  }, [getBudgetStatus]);

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
    ],
  );

  return (
    <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
  );
}

export const useBudget = () => {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error("useBudget must be used inside BudgetProvider");
  return ctx;
};
