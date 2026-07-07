
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DESIGN_TOKENS, getAppTheme } from "../constants/theme";

const THEME_STORAGE_KEY = "app_theme";

const ThemeContext = createContext(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState("light");
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        const mode = saved === "light" || saved === "dark" ? saved : "light";
        setThemeModeState(mode);
        setColorScheme(mode);
      } catch {
        setThemeModeState("light");
        setColorScheme("light");
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

  const theme = useMemo(() => getAppTheme(themeMode), [themeMode]);
  const isDark = themeMode === "dark";

  return (
    <ThemeContext.Provider
      value={{ theme, tokens: DESIGN_TOKENS, isDark, themeMode, setTheme, toggleTheme }}>
      
      {children}
    </ThemeContext.Provider>);

}
