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
import { INBOX_KEY, MAX_INBOX_SIZE } from "../context/NotificationsContext";

const NOTIF_SENT_KEY = "budget_notif_sent_v1";
const ADVISOR_FOLLOWUPS_KEY = "advisor_followup_reminders_v1";
const PRIORITY_COOLDOWN_MS = {
  critical: 4 * 60 * 60 * 1000,
  warning: 12 * 60 * 60 * 1000,
  info: 24 * 60 * 60 * 1000
};

function getCooldownMs(priority = "warning") {
  return PRIORITY_COOLDOWN_MS[priority] || PRIORITY_COOLDOWN_MS.warning;
}







export async function saveToInbox({ type, title, body, lang }) {
  const notification = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    body,
    lang,
    timestamp: Date.now(),
    read: false
  };
  try {
    const raw = await AsyncStorage.getItem(INBOX_KEY);
    const existing = raw ? JSON.parse(raw) : [];

    const updated = [notification, ...existing].slice(0, MAX_INBOX_SIZE);
    await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(updated));
  } catch {

  }
}




export async function queuePriorityNotification({
  dedupeKey,
  priority,
  title,
  body,
  type,
  lang
}) {
  if (!dedupeKey || !body) return false;

  let sent = {};
  try {
    const raw = await AsyncStorage.getItem(NOTIF_SENT_KEY);
    if (raw) sent = JSON.parse(raw);
  } catch {

  }

  const now = Date.now();
  const cooldownMs = getCooldownMs(priority);
  const lastSent = sent[dedupeKey] || 0;
  if (now - lastSent < cooldownMs) return false;

  if (!IS_EXPO_GO) {
    const Notifications = require("expo-notifications");
    const granted = await requestNotificationPermission();
    if (granted) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title || "Novence",
          body,
          sound: true
        },
        trigger: null
      });
    }
  }

  await saveToInbox({ type: type || priority, title: title || "Novence", body, lang });
  sent[dedupeKey] = now;
  try {
    await AsyncStorage.setItem(NOTIF_SENT_KEY, JSON.stringify(sent));
  } catch {

  }

  return true;
}

export async function scheduleAdvisorFollowUpReminder({
  reminderId,
  title,
  body,
  dueAt,
  ctaType
}) {
  if (!reminderId || !title || !body) return;

  const dueTimestamp = Number.isFinite(Number(dueAt)) ?
  Number(dueAt) :
  Date.now() + 24 * 60 * 60 * 1000;

  try {
    const raw = await AsyncStorage.getItem(ADVISOR_FOLLOWUPS_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(existing) ? [...existing] : [];

    const idx = next.findIndex((item) => item.id === reminderId);
    const payload = {
      id: reminderId,
      title,
      body,
      ctaType: ctaType || "open_advisor",
      dueAt: dueTimestamp,
      acceptedAt: Date.now(),
      sent: false
    };

    if (idx >= 0) next[idx] = payload;else
    next.unshift(payload);

    await AsyncStorage.setItem(
      ADVISOR_FOLLOWUPS_KEY,
      JSON.stringify(next.slice(0, 20))
    );
  } catch {

  }
}

export async function processAdvisorFollowUpReminders(t) {
  try {
    const raw = await AsyncStorage.getItem(ADVISOR_FOLLOWUPS_KEY);
    const reminders = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(reminders) || reminders.length === 0) return 0;

    const now = Date.now();
    let sentCount = 0;
    const next = [];

    for (const reminder of reminders) {
      if (!reminder || !reminder.id) continue;
      if (reminder.sent) {
        next.push(reminder);
        continue;
      }

      if (Number(reminder.dueAt || 0) > now) {
        next.push(reminder);
        continue;
      }

      const body = t(
        "advisor.followUpReminderBody",
        {
          defaultValue: "Reminder: {{body}}",
          body: reminder.body
        }
      );

      const emitted = await queuePriorityNotification({
        dedupeKey: `advisor_followup:${reminder.id}`,
        priority: "info",
        type: "advisor_followup",
        title: reminder.title,
        body
      });

      next.push({
        ...reminder,
        sent: emitted,
        sentAt: emitted ? now : null
      });

      if (emitted) sentCount += 1;
    }

    await AsyncStorage.setItem(ADVISOR_FOLLOWUPS_KEY, JSON.stringify(next));
    return sentCount;
  } catch {
    return 0;
  }
}



const IS_EXPO_GO = Constants.appOwnership === "expo";





export async function requestNotificationPermission() {
  if (IS_EXPO_GO) return false;
  const Notifications = require("expo-notifications");
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}










export async function checkAndNotifyBudgets(budgetSummary, t) {
  if (!budgetSummary || budgetSummary.length === 0) return;

  const alerts = budgetSummary.filter(
    (b) => b.status === "warning" || b.status === "over"
  );

  if (IS_EXPO_GO) {

    if (alerts.length > 0) {
      console.log(
        "[NotificationService] Expo Go – saving inbox entries for:",
        alerts.map((b) => `${b.key} (${b.percentage}% – ${b.status})`)
      );
      for (const budget of alerts) {
        const categoryName = t(`analytics.categories.${budget.key}`);
        const body =
        budget.status === "over" ?
        t("dashboard.budgetAlert.over", { category: categoryName }) :
        t("dashboard.budgetAlert.warning", {
          category: categoryName,
          pct: budget.percentage
        });
        await queuePriorityNotification({
          dedupeKey: `budget:${budget.key}:${budget.status}`,
          priority: budget.status === "over" ? "critical" : "warning",
          type: budget.status === "over" ? "budget_over" : "budget_warning",
          title: "Novence 💳",
          body
        });
      }
    }
    return;
  }

  for (const budget of budgetSummary) {
    if (budget.status !== "warning" && budget.status !== "over") continue;

    const categoryName = t(`analytics.categories.${budget.key}`);
    const body =
    budget.status === "over" ?
    t("dashboard.budgetAlert.over", { category: categoryName }) :
    t("dashboard.budgetAlert.warning", {
      category: categoryName,
      pct: budget.percentage
    });

    await queuePriorityNotification({
      dedupeKey: `budget:${budget.key}:${budget.status}`,
      priority: budget.status === "over" ? "critical" : "warning",
      type: budget.status === "over" ? "budget_over" : "budget_warning",
      title: "Novence 💳",
      body
    });
  }
}