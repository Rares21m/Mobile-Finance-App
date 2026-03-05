/**
 * @fileoverview Local notification service for Novence.
 * Uses expo-notifications to schedule budget-alert notifications.
 * No APNs/FCM server needed — notifications are fired locally on-device.
 *
 * Cooldown: a notification for a given budget category is not re-sent
 * within 12 hours, to avoid spamming the user.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const NOTIF_SENT_KEY = "budget_notif_sent_v1";
const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours per category

// expo-notifications push-token auto-registration was removed from Expo Go in
// SDK 53. We guard every call so the module is only loaded in dev/prod builds.
const IS_EXPO_GO = Constants.appOwnership === "expo";

/**
 * Request notification permissions from the OS.
 * @returns {Promise<boolean>} true if granted
 */
export async function requestNotificationPermission() {
  if (IS_EXPO_GO) return false;
  const Notifications = require("expo-notifications");
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Check the budget summary and schedule an immediate local notification
 * for any category that is at "warning" (≥75%) or "over" (≥100%) status,
 * respecting the 12-hour cooldown per category.
 *
 * @param {Array<{key: string, percentage: number|null, status: string}>} budgetSummary
 *   The return value of BudgetContext.getBudgetSummary()
 * @param {Function} t  i18next translation function
 */
export async function checkAndNotifyBudgets(budgetSummary, t) {
  if (IS_EXPO_GO || !budgetSummary || budgetSummary.length === 0) {
    // In Expo Go: log what would have been notified (for dev testing)
    if (IS_EXPO_GO && budgetSummary?.length > 0) {
      const alerts = budgetSummary.filter(
        (b) => b.status === "warning" || b.status === "over",
      );
      if (alerts.length > 0) {
        console.log(
          "[NotificationService] Expo Go – would send notifications for:",
          alerts.map((b) => `${b.key} (${b.percentage}% – ${b.status})`),
        );
      }
    }
    return;
  }

  const Notifications = require("expo-notifications");
  const granted = await requestNotificationPermission();
  if (!granted) return;

  let sent = {};
  try {
    const raw = await AsyncStorage.getItem(NOTIF_SENT_KEY);
    if (raw) sent = JSON.parse(raw);
  } catch {
    // Corrupted storage — start fresh
  }

  const now = Date.now();
  const updated = { ...sent };

  for (const budget of budgetSummary) {
    if (budget.status !== "warning" && budget.status !== "over") continue;

    const lastSent = sent[budget.key] || 0;
    if (now - lastSent < COOLDOWN_MS) continue;

    const categoryName = t(`analytics.categories.${budget.key}`);
    const body =
      budget.status === "over"
        ? t("dashboard.budgetAlert.over", { category: categoryName })
        : t("dashboard.budgetAlert.warning", {
            category: categoryName,
            pct: budget.percentage,
          });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Novence 💳",
        body,
        sound: true,
      },
      trigger: null, // fire immediately
    });

    updated[budget.key] = now;
  }

  try {
    await AsyncStorage.setItem(NOTIF_SENT_KEY, JSON.stringify(updated));
  } catch {
    // Non-critical — ignore write failures
  }
}
