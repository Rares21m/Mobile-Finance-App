import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { vars } from "nativewind";
import { View } from "react-native";
import { Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import CircularLoading from "../components/CircularLoading";
import Toast from "../components/Toast";
import { paperTheme } from "../constants/theme";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { BankProvider } from "../context/BankContext";
import { BudgetProvider } from "../context/BudgetContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";
import "../global.css";
import "../i18n/i18n";

// Prevent the native splash from auto-hiding — we control it manually in AuthContext
SplashScreen.preventAutoHideAsync();

function SplashOverlay() {
  const { showSplash } = useAuth();
  if (!showSplash) return null;
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998,
      }}
    >
      <CircularLoading />
    </View>
  );
}

function RootLayoutContent() {
  const { isDark, theme } = useTheme();

  const cssVars = vars({
    "--color-bg": theme.colors.bg,
    "--color-surface": theme.colors.surface,
    "--color-card": theme.colors.card,
    "--color-border": theme.colors.border,

    "--color-foreground": theme.colors.foreground,
    "--color-text-muted": theme.colors.textMuted,
    "--color-text-inverse": theme.colors.textInverse,

    "--color-primary": theme.colors.primary,
    "--color-primary-dark": theme.colors.primaryDark,

    "--color-accent": theme.colors.accent,

    "--color-expense": theme.colors.expense,
    "--color-success": theme.colors.success,
  });

  return (
    <SafeAreaProvider>
      <View
        style={[{ flex: 1 }, cssVars]}
        className={isDark ? "dark" : "light"}
      >
        <ToastProvider>
          <AuthProvider>
            <BankProvider>
              <BudgetProvider>
                <StatusBar style={isDark ? "light" : "dark"} />
                <NavigationThemeProvider
                  value={isDark ? DarkTheme : DefaultTheme}
                >
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(tabs)" />
                  </Stack>
                </NavigationThemeProvider>
                <Toast />
                <SplashOverlay />
              </BudgetProvider>
            </BankProvider>
          </AuthProvider>
        </ToastProvider>
      </View>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </PaperProvider>
  );
}
