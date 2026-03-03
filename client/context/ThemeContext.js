/**
 * @fileoverview Theme context for the Novence app.
 * Provides dark/light theme switching with persistence via AsyncStorage.
 * Exposes `theme` (color palette), `isDark`, `themeMode`, and `setTheme`.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "app_theme";

export const THEMES = {
  dark: {
    mode: "dark",
    statusBar: "light-content",
    colors: {
      // Dark Dim — blue-slate, clearly not black, easy on the eyes
      bg: "#22272E",
      surface: "#2D333B",
      card: "#373E47",
      border: "#4C5566",
      foreground: "#ADBAC7",
      textMuted: "#768390",
      textInverse: "#22272E",

      primary: "#10B981",
      primaryDark: "#059669",
      accent: "#818CF8",

      expense: "#F47067",
      success: "#57AB5A",

      overlay: "rgba(22,27,34,0.80)",
      handle: "#4C5566",
      placeholder: "#636E7B",

      headerGradient: ["#2D333B", "#22272E"],
      balanceCardGradient: ["#373E47", "#2D333B"],
      balanceCardBorder: "rgba(129,140,248,0.22)",
      emptyCardGradient: ["#2D333B", "#373E47"],
      connectButtonGradient: [
        "rgba(16,185,129,0.10)",
        "rgba(129,140,248,0.08)",
      ],
      connectButtonBorder: "rgba(16,185,129,0.25)",
      authBgGradient: ["#22272E", "#1E2D3D", "#22272E"],
      authDecorCircle1: "rgba(16,185,129,0.10)",
      authDecorCircle2: "rgba(129,140,248,0.08)",

      chartInnerCircle: "#2D333B",
      chartAxisColor: "rgba(173,186,199,0.08)",
      chartAxisTextColor: "#768390",

      dividerColor: "rgba(173,186,199,0.08)",
      categoryBorder: "rgba(173,186,199,0.06)",
      webViewIconColor: "#ADBAC7",
    },
  },

  light: {
    mode: "light",
    statusBar: "dark-content",
    colors: {
      // Clean cool-white — white cards pop off slate-tinted bg
      bg: "#ECEEF5",
      surface: "#F5F6FB",
      card: "#FFFFFF",
      border: "#D6DAE8",

      foreground: "#0D1117",
      textMuted: "#5A6A82",
      textInverse: "#FFFFFF",

      primary: "#0D9E6E",
      primaryDark: "#0A7A55",
      accent: "#4A4DC4",

      expense: "#C93B58",
      success: "#15994A",

      overlay: "rgba(13,17,23,0.28)",
      handle: "#C5CCDB",
      placeholder: "#7A8BA8",

      headerGradient: ["#F5F6FB", "#ECEEF5"],
      balanceCardGradient: ["#ECEEF5", "#F5F6FB"],
      balanceCardBorder: "rgba(74,77,196,0.18)",
      emptyCardGradient: ["#EEF0F8", "#E8EBF4"],
      connectButtonGradient: ["rgba(13,158,110,0.09)", "rgba(74,77,196,0.06)"],
      connectButtonBorder: "rgba(13,158,110,0.22)",
      authBgGradient: ["#ECEEF5", "#E6EAF4", "#ECEEF5"],
      authDecorCircle1: "rgba(13,158,110,0.10)",
      authDecorCircle2: "rgba(74,77,196,0.07)",

      chartInnerCircle: "#F5F6FB",
      chartAxisColor: "rgba(13,17,23,0.07)",
      chartAxisTextColor: "#7A8BA8",

      dividerColor: "#D6DAE8",
      categoryBorder: "#D6DAE8",
      webViewIconColor: "#0D1117",
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
    <ThemeContext.Provider
      value={{ theme, isDark, themeMode, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
