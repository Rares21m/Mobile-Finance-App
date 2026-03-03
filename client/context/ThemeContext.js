/**
 * @fileoverview Theme context for the Novence app.
 * Provides dark/light theme switching with persistence via AsyncStorage.
 * Exposes `theme` (color palette), `isDark`, `themeMode`, and `setTheme`.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "nativewind";

const THEME_STORAGE_KEY = "app_theme";

export const THEMES = {
  dark: {
    mode: "dark",
    statusBar: "light-content",
    colors: {
      bg: "#0C0C14",
      surface: "#161621",
      card: "#1C1C2A",
      border: "#2A2A3C",
      foreground: "#FFFFFF",
      textMuted: "#9CA3AF",
      textInverse: "#0F172A",

      primary: "#10B981",
      primaryDark: "#059669",
      accent: "#6366F1",

      expense: "#F43F5E",
      success: "#22C55E",

      overlay: "rgba(0,0,0,0.65)",
      handle: "#2A2A3C",
      placeholder: "#4B5563",

      headerGradient: ["#161621", "#0C0C14"],
      balanceCardGradient: ["#1E293B", "#0F172A"],
      balanceCardBorder: "rgba(99,102,241,0.15)",
      emptyCardGradient: ["#161621", "#1C1C2A"],
      connectButtonGradient: ["rgba(16,185,129,0.08)", "rgba(99,102,241,0.06)"],
      connectButtonBorder: "rgba(16,185,129,0.15)",
      authBgGradient: ["#0C0C14", "#0A1A14", "#0C0C14"],
      authDecorCircle1: "rgba(16,185,129,0.08)",
      authDecorCircle2: "rgba(99,102,241,0.06)",

      chartInnerCircle: "#161621",
      chartAxisColor: "rgba(255,255,255,0.06)",
      chartAxisTextColor: "#4B5563",

      dividerColor: "rgba(255,255,255,0.06)",
      categoryBorder: "rgba(255,255,255,0.04)",
      webViewIconColor: "#FFFFFF",
    },
  },

  light: {
    mode: "light",
    statusBar: "dark-content",
    colors: {
      bg: "#F8F5EF",
      surface: "#F1ECE4",
      card: "#FFFFFF",
      border: "#D8D2C8",

      foreground: "#141E30",
      textMuted: "#4A5C78",
      textInverse: "#FFFFFF",

      primary: "#4A4DC4",
      primaryDark: "#2F3192",
      accent: "#0D9E6E",

      expense: "#C93B58",
      success: "#15994A",

      overlay: "rgba(20,30,48,0.25)",
      handle: "#CFC7BB",
      placeholder: "#7A8BA8",

      headerGradient: ["#F1ECE4", "#F8F5EF"],
      balanceCardGradient: ["#1A3252", "#0F2240"],
      balanceCardBorder: "rgba(74,77,196,0.18)",
      emptyCardGradient: ["#EFE9DF", "#E7DFD2"],
      connectButtonGradient: ["rgba(13,158,110,0.09)", "rgba(74,77,196,0.06)"],
      connectButtonBorder: "rgba(13,158,110,0.22)",
      authBgGradient: ["#F8F5EF", "#EFE9DF", "#F8F5EF"],
      authDecorCircle1: "rgba(13,158,110,0.10)",
      authDecorCircle2: "rgba(74,77,196,0.07)",

      chartInnerCircle: "#F1ECE4",
      chartAxisColor: "rgba(20,30,48,0.07)",
      chartAxisTextColor: "#7A8BA8",

      dividerColor: "#D8D2C8",
      categoryBorder: "#D8D2C8",
      webViewIconColor: "#141E30",
    },
  },
};

const ThemeContext = createContext(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState("dark");
  const { setColorScheme } = useColorScheme();


  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        const mode = saved === "light" || saved === "dark" ? saved : "dark";
        setThemeModeState(mode);
        setColorScheme(mode);
      } catch {
        setThemeModeState("dark");
        setColorScheme("dark");
      }
    })();
  }, []);


  useEffect(() => {
    setColorScheme(themeMode);
  }, [themeMode]);

  async function setTheme(mode) {
    if (mode !== "dark" && mode !== "light") return;
    setThemeModeState(mode);
    setColorScheme(mode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  }

  function toggleTheme() {
    setTheme(themeMode === "dark" ? "light" : "dark");
  }

  const theme = useMemo(() => THEMES[themeMode], [themeMode]);
  const isDark = themeMode === "dark";

  return (
    <ThemeContext.Provider value={{ theme, isDark, themeMode, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}