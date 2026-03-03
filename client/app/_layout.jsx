import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { vars } from "nativewind";
import { Provider as PaperProvider } from "react-native-paper";
import { paperTheme } from "../constants/theme";
import { AuthProvider } from "../context/AuthContext";
import { BankProvider } from "../context/BankContext";
import { ThemeProvider as NavigationThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import "../global.css";
import "../i18n/i18n";

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
    <View style={[{ flex: 1 }, cssVars]} className={isDark ? "dark" : "light"}>
      <AuthProvider>
        <BankProvider>
          <StatusBar style={isDark ? "light" : "dark"} />
          <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </NavigationThemeProvider>
        </BankProvider>
      </AuthProvider>
    </View>
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