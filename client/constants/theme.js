import {
  MD3DarkTheme as PaperDarkTheme,
  MD3LightTheme as PaperLightTheme } from
"react-native-paper";

export const DESIGN_TOKENS = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 999
  },
  typography: {
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 24,
      xxl: 32
    },
    lineHeights: {
      sm: 18,
      md: 22,
      lg: 28,
      xl: 34
    }
  },
  elevation: {
    card: 2,
    modal: 8,
    floating: 12
  },
  motion: {
    fast: 150,
    normal: 250,
    slow: 350
  }
};

export const APP_THEMES = {
  dark: {
    mode: "dark",
    statusBar: "light-content",
    colors: {
      bg: "#0A0A0A",
      surface: "#121212",
      card: "#1A1A1A",
      border: "#2A2A2A",
      foreground: "#EDEDED",
      textMuted: "#A3A3A3",
      textInverse: "#0A0A0A",

      primary: "#10B981",
      primaryDark: "#059669",
      accent: "#818CF8",
      warning: "#F59E0B",
      info: "#60A5FA",
      trust: "#2DD4BF",
      neutral: "#768390",

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
      "rgba(129,140,248,0.08)"],

      connectButtonBorder: "rgba(16,185,129,0.25)",
      authBgGradient: ["#22272E", "#1E2D3D", "#22272E"],
      authDecorCircle1: "rgba(16,185,129,0.10)",
      authDecorCircle2: "rgba(129,140,248,0.08)",

      chartInnerCircle: "#2D333B",
      chartAxisColor: "rgba(173,186,199,0.08)",
      chartAxisTextColor: "#768390",

      dividerColor: "rgba(173,186,199,0.08)",
      categoryBorder: "rgba(173,186,199,0.06)",
      webViewIconColor: "#ADBAC7"
    }
  },

  light: {
    mode: "light",
    statusBar: "dark-content",
    colors: {
      bg: "#F8F9FA",
      surface: "#FFFFFF",
      card: "#FFFFFF",
      border: "#E9ECEF",

      foreground: "#111827",
      textMuted: "#6B7280",
      textInverse: "#FFFFFF",

      primary: "#10B981",
      primaryDark: "#059669",
      accent: "#4A4DC4",
      warning: "#B45309",
      info: "#2563EB",
      trust: "#0F766E",
      neutral: "#5A6A82",

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
      webViewIconColor: "#0D1117"
    }
  }
};

export function getAppTheme(mode) {
  return APP_THEMES[mode] || APP_THEMES.dark;
}

export function createPaperTheme(appTheme) {
  const base = appTheme?.mode === "light" ? PaperLightTheme : PaperDarkTheme;

  return {
    ...base,
    roundness: DESIGN_TOKENS.radius.lg,
    colors: {
      ...base.colors,
      primary: appTheme.colors.primary,
      secondary: appTheme.colors.accent,
      background: appTheme.colors.bg,
      surface: appTheme.colors.surface,
      surfaceVariant: appTheme.colors.card,
      error: appTheme.colors.expense,
      onPrimary: appTheme.colors.textInverse,
      onSurface: appTheme.colors.foreground,
      outline: appTheme.colors.border
    }
  };
}