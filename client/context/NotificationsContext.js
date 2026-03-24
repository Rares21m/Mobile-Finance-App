/**
 * @fileoverview Notifications Inbox context for Novence.
 * Persists a history of in-app alerts (budget warnings, badges earned,
 * monthly check-ins) in AsyncStorage so the user can review them later.
 *
 * The INBOX_KEY is also used directly by NotificationService and
 * BadgesContext to append entries without needing React context.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState } from
"react";

export const INBOX_KEY = "notifications_inbox_v1";
export const MAX_INBOX_SIZE = 50;

const NotificationsContext = createContext(null);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
  throw new Error(
    "useNotifications must be used within NotificationsProvider"
  );
  return ctx;
}

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);


  const reload = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(INBOX_KEY);
      if (raw) setNotifications(JSON.parse(raw));
    } catch {

    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => n.id === id ? { ...n, read: true } : n);
      AsyncStorage.setItem(INBOX_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      AsyncStorage.setItem(INBOX_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    await AsyncStorage.removeItem(INBOX_KEY);
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        reload,
        markAsRead,
        markAllAsRead,
        clearAll
      }}>
      
      {children}
    </NotificationsContext.Provider>);

}