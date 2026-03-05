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
  useState,
} from "react";
import {
  CATEGORIES,
  filterByPeriod,
  getCategoryBreakdown,
} from "../utils/categoryUtils";
import { useBankData } from "./BankContext";

const BUDGET_STORAGE_KEY = "budget_limits_v1";
const EVENT_BUDGETS_KEY = "event_budgets_v1";

const BudgetContext = createContext(null);

// ─── 50/30/20 classification ──────────────────────────────────────────────────
// Needs (50%): food, transport, utilities, housing, health
// Wants (30%): shopping, entertainment, other
// Savings (20%): not allocated to categories — just informational
const NEEDS_CATEGORIES = ["food", "transport", "utilities", "housing", "health"];
const WANTS_CATEGORIES = ["shopping", "entertainment", "other"];

// Midpoint for each income range
const INCOME_MIDPOINTS = {
  under_1500: 1200,
  "1500_3000": 2250,
  "3000_6000": 4500,
  over_6000: 8000,
};

export function BudgetProvider({ children }) {
  const { transactions } = useBankData();

  // ── Monthly budget limits ───────────────────────────────────────────────
  /** limits: { food: 500, transport: 300, ... } */
  const [limits, setLimits] = useState({});
  const [loaded, setLoaded] = useState(false);

  // ── Event budgets ───────────────────────────────────────────────────────
  const [eventBudgets, setEventBudgets] = useState([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);

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

  // ── Load persisted event budgets on mount ───────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(EVENT_BUDGETS_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setEventBudgets(JSON.parse(raw));
          } catch {
            // corrupted
          }
        }
      })
      .finally(() => setEventsLoaded(true));
  }, []);

  // ── Persist limits to AsyncStorage whenever they change ─────────────────
  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(limits)).catch(
        () => { },
      );
    }
  }, [limits, loaded]);

  // ── Persist event budgets ───────────────────────────────────────────────
  useEffect(() => {
    if (eventsLoaded) {
      AsyncStorage.setItem(
        EVENT_BUDGETS_KEY,
        JSON.stringify(eventBudgets),
      ).catch(() => { });
    }
  }, [eventBudgets, eventsLoaded]);

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

  // ═══════════════════════════════════════════════════════════════════════════
  // ── 50/30/20  BUDGET SUGGESTIONS ──────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Given a user profile (from OnboardingContext), compute suggested budgets
   * using the 50/30/20 rule.
   * @param {Object} profile - { goal, incomeRange, priorityCategories }
   * @returns {Array<{ key, suggestedLimit, type }>}  type = 'need' | 'want'
   */
  const getSuggestedBudgets = useCallback((profile) => {
    if (!profile?.incomeRange) return [];

    const income = INCOME_MIDPOINTS[profile.incomeRange] || 2250;
    const needsBudget = income * 0.5; // 50%
    const wantsBudget = income * 0.3; // 30%
    // 20% goes to savings — not allocated

    const priorities = profile.priorityCategories || [];

    // Filter to categories the user selected as priorities
    const needsCats = priorities.filter((k) => NEEDS_CATEGORIES.includes(k));
    const wantsCats = priorities.filter((k) => WANTS_CATEGORIES.includes(k));

    // If user didn't pick any needs, default to common ones
    const finalNeeds = needsCats.length > 0 ? needsCats : ["food", "transport"];
    const finalWants = wantsCats.length > 0 ? wantsCats : [];

    const suggestions = [];

    // Distribute needs budget equally among needs categories
    if (finalNeeds.length > 0) {
      const perNeed = Math.round((needsBudget / finalNeeds.length) * 100) / 100;
      finalNeeds.forEach((key) => {
        suggestions.push({ key, suggestedLimit: perNeed, type: "need" });
      });
    }

    // Distribute wants budget equally among wants categories
    if (finalWants.length > 0) {
      const perWant = Math.round((wantsBudget / finalWants.length) * 100) / 100;
      finalWants.forEach((key) => {
        suggestions.push({ key, suggestedLimit: perWant, type: "want" });
      });
    }

    return suggestions;
  }, []);

  /**
   * Apply suggested budgets — copies suggestions into the limits state.
   */
  const applySuggestedBudgets = useCallback((suggestions) => {
    setLimits((prev) => {
      const next = { ...prev };
      suggestions.forEach(({ key, suggestedLimit }) => {
        next[key] = suggestedLimit;
      });
      return next;
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // ── EVENT BUDGETS (vacations, weekends, etc.) ─────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add a new event budget.
   * @param {{ name, totalLimit, startDate, endDate, categories? }} budget
   */
  const addEventBudget = useCallback((budget) => {
    const newBudget = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      name: budget.name,
      totalLimit: parseFloat(budget.totalLimit),
      startDate: budget.startDate,
      endDate: budget.endDate,
      categories: budget.categories || [], // empty = all categories
      createdAt: new Date().toISOString(),
    };
    setEventBudgets((prev) => [...prev, newBudget]);
    return newBudget;
  }, []);

  /**
   * Update an existing event budget.
   */
  const updateEventBudget = useCallback((id, data) => {
    setEventBudgets((prev) =>
      prev.map((eb) => (eb.id === id ? { ...eb, ...data } : eb)),
    );
  }, []);

  /**
   * Remove an event budget.
   */
  const removeEventBudget = useCallback((id) => {
    setEventBudgets((prev) => prev.filter((eb) => eb.id !== id));
  }, []);

  /**
   * Compute spent amount for a given event budget from transactions.
   */
  const getEventBudgetStatus = useCallback(
    (eventBudget) => {
      const start = new Date(eventBudget.startDate);
      const end = new Date(eventBudget.endDate);
      end.setHours(23, 59, 59, 999);

      const relevantTx = transactions.filter((tx) => {
        const d = new Date(tx.bookingDate || tx.valueDate);
        if (d < start || d > end) return false;
        const amount = parseFloat(tx.transactionAmount?.amount || 0);
        if (amount >= 0) return false; // only expenses

        // If categories are specified, filter by them
        if (eventBudget.categories && eventBudget.categories.length > 0) {
          const description = [
            tx.remittanceInformationUnstructured || "",
            tx.creditorName || "",
            tx.debtorName || "",
          ]
            .join(" ")
            .toLowerCase();

          const { categorizeTransaction } = require("../utils/categoryUtils");
          const cat = categorizeTransaction(tx);
          return eventBudget.categories.includes(cat.key);
        }
        return true;
      });

      const spent = relevantTx.reduce(
        (sum, tx) =>
          sum + Math.abs(parseFloat(tx.transactionAmount?.amount || 0)),
        0,
      );
      const spentRounded = Math.round(spent * 100) / 100;
      const rawPct =
        eventBudget.totalLimit > 0
          ? (spentRounded / eventBudget.totalLimit) * 100
          : 0;
      const percentage = Math.round(Math.min(rawPct, 999));

      const now = new Date();
      let status = "ok";
      if (now > end) status = "expired";
      else if (rawPct >= 100) status = "over";
      else if (rawPct >= 75) status = "warning";
      else if (now >= start) status = "active";
      else status = "upcoming";

      return {
        spent: spentRounded,
        limit: eventBudget.totalLimit,
        percentage,
        status,
        daysLeft: now <= end ? Math.max(0, Math.ceil((end - now) / 86400000)) : 0,
      };
    },
    [transactions],
  );

  /**
   * Get all active event budgets (current date is within start–end range).
   */
  const getActiveEventBudgets = useCallback(() => {
    const now = new Date();
    return eventBudgets.filter((eb) => {
      const start = new Date(eb.startDate);
      const end = new Date(eb.endDate);
      end.setHours(23, 59, 59, 999);
      return now >= start && now <= end;
    });
  }, [eventBudgets]);

  // ═══════════════════════════════════════════════════════════════════════════

  const value = useMemo(
    () => ({
      // Monthly budgets
      limits,
      loaded,
      setBudgetLimit,
      currentMonthSpending,
      totalBudgeted,
      totalSpentOnBudgeted,
      getBudgetStatus,
      getBudgetSummary,
      // Suggestions
      getSuggestedBudgets,
      applySuggestedBudgets,
      // Event budgets
      eventBudgets,
      eventsLoaded,
      addEventBudget,
      updateEventBudget,
      removeEventBudget,
      getEventBudgetStatus,
      getActiveEventBudgets,
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
      getSuggestedBudgets,
      applySuggestedBudgets,
      eventBudgets,
      eventsLoaded,
      addEventBudget,
      updateEventBudget,
      removeEventBudget,
      getEventBudgetStatus,
      getActiveEventBudgets,
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
