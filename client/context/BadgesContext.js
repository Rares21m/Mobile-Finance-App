/**
 * @fileoverview Badges / Gamification context for the Novence app.
 * Manages the full badge catalogue with earned status, total XP points,
 * and a queue of newly earned badges to celebrate via modal.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import api from "../services/api";
import { saveToInbox } from "../services/NotificationService";
import { useAuth } from "./AuthContext";

const BadgesContext = createContext(null);

export function useBadges() {
  const ctx = useContext(BadgesContext);
  if (!ctx) throw new Error("useBadges must be used within BadgesProvider");
  return ctx;
}

export function BadgesProvider({ children }) {
  const { token } = useAuth();
  const [badges, setBadges] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [pendingBadges, setPendingBadges] = useState([]); // queue of newly earned badges
  const evaluating = useRef(false);

  // ── Load badges when user logs in ─────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setBadges([]);
      setTotalPoints(0);
      setPendingBadges([]);
      return;
    }
    api
      .get("/badges")
      .then((res) => {
        setBadges(res.data.badges || []);
        setTotalPoints(res.data.totalPoints || 0);
      })
      .catch(() => {});
  }, [token]);

  /**
   * Call the evaluate endpoint to check for newly earned badges.
   * Should be called after key user actions (set budget, create goal, etc.).
   * New badges are added to the pendingBadges queue for the modal.
   */
  const triggerEvaluate = useCallback(async () => {
    if (!token || evaluating.current) return;
    evaluating.current = true;
    try {
      const res = await api.post("/badges/evaluate");
      const newBadges = res.data.newBadges || [];
      if (newBadges.length > 0) {
        // Update catalogue state to reflect newly earned badges
        setBadges((prev) =>
          prev.map((b) => {
            const earned = newBadges.find((nb) => nb.id === b.id);
            if (earned)
              return { ...b, earned: true, earnedAt: new Date().toISOString() };
            return b;
          }),
        );
        setTotalPoints(
          (prev) =>
            prev + newBadges.reduce((sum, b) => sum + (b.points || 0), 0),
        );
        setPendingBadges((prev) => [...prev, ...newBadges]);
        // Persist each earned badge to the Inbox for history
        for (const badge of newBadges) {
          saveToInbox({
            type: "badge_earned",
            title: badge.name || "Badge earned",
            body: badge.description || `+${badge.points || 0} XP`,
          });
        }
      }
    } catch {
      // silently ignore
    } finally {
      evaluating.current = false;
    }
  }, [token]);

  /**
   * Handle new badges returned directly from an API response (e.g., create goal).
   * Merges them into the catalogue and queues them for celebration.
   */
  const handleApiNewBadges = useCallback((newBadges) => {
    if (!newBadges || newBadges.length === 0) return;
    setBadges((prev) =>
      prev.map((b) => {
        const earned = newBadges.find((nb) => nb.id === b.id);
        if (earned)
          return { ...b, earned: true, earnedAt: new Date().toISOString() };
        return b;
      }),
    );
    setTotalPoints(
      (prev) => prev + newBadges.reduce((sum, b) => sum + (b.points || 0), 0),
    );
    setPendingBadges((prev) => [...prev, ...newBadges]);
    // Persist each earned badge to the Inbox for history
    for (const badge of newBadges) {
      saveToInbox({
        type: "badge_earned",
        title: badge.name || "Badge earned",
        body: badge.description || `+${badge.points || 0} XP`,
      });
    }
  }, []);

  /** Remove the first badge from the pending queue (after user dismisses modal). */
  const dismissPendingBadge = useCallback(() => {
    setPendingBadges((prev) => prev.slice(1));
  }, []);

  const value = useMemo(
    () => ({
      badges,
      totalPoints,
      pendingBadges,
      triggerEvaluate,
      handleApiNewBadges,
      dismissPendingBadge,
    }),
    [
      badges,
      totalPoints,
      pendingBadges,
      triggerEvaluate,
      handleApiNewBadges,
      dismissPendingBadge,
    ],
  );

  return (
    <BadgesContext.Provider value={value}>{children}</BadgesContext.Provider>
  );
}
