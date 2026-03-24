import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider } from
"@react-navigation/native";
import Constants from "expo-constants";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { vars } from "nativewind";
import { useEffect } from "react";
import { View } from "react-native";
import { Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import CircularLoading from "../components/CircularLoading";
import Toast from "../components/Toast";
import { createPaperTheme } from "../constants/theme";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { BankProvider } from "../context/BankContext";
import { BudgetProvider } from "../context/BudgetContext";
import { GoalsProvider } from "../context/GoalsContext";
import { InsightsProvider } from "../context/InsightsContext";
import { NotificationsProvider } from "../context/NotificationsContext";
import {
  OnboardingProvider,
  useOnboarding } from
"../context/OnboardingContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";
import "../global.css";
import "../i18n/i18n";


SplashScreen.preventAutoHideAsync();




if (Constants.appOwnership !== "expo") {
  const { setNotificationHandler } = require("expo-notifications");
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false
    })
  });
}


function NavigationGuard() {
  const { token, isLoading } = useAuth();
  const { isOnboardingDone, profileLoaded } = useOnboarding();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading || !profileLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    if (!token) {

      if (!inAuthGroup) router.replace("/(auth)/welcome");
      return;
    }


    if (!isOnboardingDone && !inOnboarding) {

      router.replace("/onboarding");
      return;
    }

    if (isOnboardingDone && (inAuthGroup || inOnboarding)) {

      router.replace("/(tabs)");
    }
  }, [token, isLoading, isOnboardingDone, profileLoaded, segments]);

  return null;
}

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
        zIndex: 9998
      }}>
      
      <CircularLoading />
    </View>);

}

function RootLayoutContent() {
  const { isDark, theme } = useTheme();
  const paperTheme = createPaperTheme(theme);

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
    "--color-success": theme.colors.success
  });

  return (
    <SafeAreaProvider>
      <View
        style={[{ flex: 1 }, cssVars]}
        className={isDark ? "dark" : "light"}>
        
        <PaperProvider theme={paperTheme}>
          <ToastProvider>
            <AuthProvider>
              <OnboardingProvider>
                <NotificationsProvider>
                  <BankProvider>
                    <BudgetProvider>
                      <GoalsProvider>
                        <InsightsProvider>
                            <StatusBar style={isDark ? "light" : "dark"} />
                            <NavigationThemeProvider
                            value={isDark ? DarkTheme : DefaultTheme}>
                            
                              <Stack screenOptions={{ headerShown: false }}>
                                <Stack.Screen name="(auth)" />
                                <Stack.Screen name="onboarding" />
                                <Stack.Screen name="(tabs)" />
                                <Stack.Screen name="transactions" />
                              </Stack>
                            </NavigationThemeProvider>
                            <NavigationGuard />
                            <Toast />
                            <SplashOverlay />
                        </InsightsProvider>
                      </GoalsProvider>
                    </BudgetProvider>
                  </BankProvider>
                </NotificationsProvider>
              </OnboardingProvider>
            </AuthProvider>
          </ToastProvider>
        </PaperProvider>
      </View>
    </SafeAreaProvider>);

}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>);

}