/**
 * @fileoverview Savings Goals context for the Novence app.
 * Syncs with the server via /api/goals (CRUD).
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const GoalsContext = createContext(null);

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error("useGoals must be used within GoalsProvider");
  return ctx;
}

export function GoalsProvider({ children }) {
  const { token } = useAuth();
  const [goals, setGoals] = useState([]);
  const [goalsLoaded, setGoalsLoaded] = useState(false);

  // Fetch goals from server whenever user logs in
  useEffect(() => {
    if (!token) {
      setGoals([]);
      setGoalsLoaded(false);
      return;
    }
    setGoalsLoaded(false);
    api
      .get("/goals")
      .then((res) => setGoals(res.data.goals || []))
      .catch(() => {})
      .finally(() => setGoalsLoaded(true));
  }, [token]);

  const createGoal = useCallback(async (data) => {
    const res = await api.post("/goals", data);
    const goal = res.data.goal;
    setGoals((prev) => [...prev, goal]);
    return goal;
  }, []);

  const updateGoal = useCallback(async (id, data) => {
    const res = await api.put(`/goals/${id}`, data);
    const updated = res.data.goal;
    setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
    return updated;
  }, []);

  const deleteGoal = useCallback(async (id) => {
    await api.delete(`/goals/${id}`);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const value = useMemo(
    () => ({ goals, goalsLoaded, createGoal, updateGoal, deleteGoal }),
    [goals, goalsLoaded, createGoal, updateGoal, deleteGoal],
  );

  return (
    <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>
  );
}
