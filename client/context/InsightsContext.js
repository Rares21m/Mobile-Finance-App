import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const InsightsContext = createContext(null);

export function useInsights() {
  const ctx = useContext(InsightsContext);
  if (!ctx) throw new Error("useInsights must be used within InsightsProvider");
  return ctx;
}

export function InsightsProvider({ children }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState(null);
  const [actionCenter, setActionCenter] = useState([]);
  const [bestNextAction, setBestNextAction] = useState(null);

  const refreshInsights = useCallback(async () => {
    if (!token) {
      setFeed(null);
      setActionCenter([]);
      setBestNextAction(null);
      return;
    }

    setLoading(true);
    try {
      const [feedRes, actionRes] = await Promise.all([
      api.get("/insights/feed"),
      api.get("/insights/action-center")]
      );
      setFeed(feedRes.data || null);
      setActionCenter(actionRes.data?.tasks || []);
      setBestNextAction(feedRes.data?.bestNextAction || null);
    } catch {

    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshInsights();
  }, [refreshInsights]);

  const convertInsightAction = useCallback(async (insightId, actionType) => {
    if (!insightId || !actionType) return;
    try {
      await api.post("/insights/convert", { insightId, actionType });
    } catch {

    }
  }, []);

  const trackKpiEvent = useCallback(async (eventType, payload = {}) => {
    if (!eventType) return;
    try {
      await api.post("/insights/kpi-event", {
        eventType,
        ...payload
      });
    } catch {

    }
  }, []);

  const value = useMemo(
    () => ({
      loading,
      feed,
      actionCenter,
      bestNextAction,
      refreshInsights,
      convertInsightAction,
      trackKpiEvent
    }),
    [
    loading,
    feed,
    actionCenter,
    bestNextAction,
    refreshInsights,
    convertInsightAction,
    trackKpiEvent]

  );

  return <InsightsContext.Provider value={value}>{children}</InsightsContext.Provider>;
}