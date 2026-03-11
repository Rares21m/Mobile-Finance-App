import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import Constants from "expo-constants";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { vars } from "nativewind";
import { useEffect } from "react";
import { View } from "react-native";
import { Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import BadgeEarnedModal from "../components/BadgeEarnedModal";
import CircularLoading from "../components/CircularLoading";
import Toast from "../components/Toast";
import { paperTheme } from "../constants/theme";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { BadgesProvider } from "../context/BadgesContext";
import { BankProvider } from "../context/BankContext";
import { BudgetProvider } from "../context/BudgetContext";
import { GoalsProvider } from "../context/GoalsContext";
import { NotificationsProvider } from "../context/NotificationsContext";
import {
    OnboardingProvider,
    useOnboarding,
} from "../context/OnboardingContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";
import "../global.css";
import "../i18n/i18n";

// Prevent the native splash from auto-hiding — we control it manually in AuthContext
SplashScreen.preventAutoHideAsync();

// Show notifications even when the app is in the foreground.
// expo-notifications push features do not work in Expo Go (SDK 53+),
// so we guard the setup to avoid the push-token auto-registration error.
if (Constants.appOwnership !== "expo") {
  const { setNotificationHandler } = require("expo-notifications");
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ─── Navigation guard: centralised routing logic ──────────────────────────────
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
      // Not logged in — go to welcome (unless already there)
      if (!inAuthGroup) router.replace("/(auth)/welcome");
      return;
    }

    // Logged in
    if (!isOnboardingDone && !inOnboarding) {
      // First-time user — show wizard
      router.replace("/onboarding");
      return;
    }

    if (isOnboardingDone && (inAuthGroup || inOnboarding)) {
      // Onboarding done and still on auth / onboarding screens — go to app
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
            <OnboardingProvider>
              <NotificationsProvider>
                <BankProvider>
                  <BudgetProvider>
                    <GoalsProvider>
                      <BadgesProvider>
                        <StatusBar style={isDark ? "light" : "dark"} />
                        <NavigationThemeProvider
                          value={isDark ? DarkTheme : DefaultTheme}
                        >
                          <Stack screenOptions={{ headerShown: false }}>
                            <Stack.Screen name="(auth)" />
                            <Stack.Screen name="onboarding" />
                            <Stack.Screen name="(tabs)" />
                            <Stack.Screen name="transactions" />
                          </Stack>
                        </NavigationThemeProvider>
                        <NavigationGuard />
                        <Toast />
                        <BadgeEarnedModal />
                        <SplashOverlay />
                      </BadgesProvider>
                    </GoalsProvider>
                  </BudgetProvider>
                </BankProvider>
              </NotificationsProvider>
            </OnboardingProvider>
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
