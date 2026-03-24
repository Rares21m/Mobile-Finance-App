/**
 * @fileoverview Global toast notification context.
 * Provides a lightweight, non-intrusive alternative to Alert.alert.
 * Toasts appear at the top of the screen and auto-dismiss after 3 seconds.
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState } from
"react";

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = "info") => {

    if (timerRef.current) clearTimeout(timerRef.current);

    setToast({ message, type });

    timerRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toast }}>
      {children}
    </ToastContext.Provider>);

}