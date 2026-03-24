import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CATEGORIES } from "../../utils/categoryUtils";

const NUDGE_DISMISS_KEY = "nudge_dismissed_v1";

export default function NudgeCard({
  accounts,
  limits,
  currentMonthSpending,
  profile,
  budgetSummary,
  totalIncome,
  totalExpenses,
  router,
  c,
  t
}) {
  const [dismissedUntil, setDismissedUntil] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(NUDGE_DISMISS_KEY).
    then((raw) => {
      if (raw) setDismissedUntil(JSON.parse(raw));
    }).
    finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  const now = Date.now();
  const isDismissed = (key) => dismissedUntil[key] && now < dismissedUntil[key];

  const dismiss = async (key) => {
    const updated = { ...dismissedUntil, [key]: now + 24 * 60 * 60 * 1000 };
    setDismissedUntil(updated);
    await AsyncStorage.setItem(NUDGE_DISMISS_KEY, JSON.stringify(updated));
  };

  let nudge = null;

  if (!nudge && !isDismissed("no_bank") && accounts.length === 0) {
    nudge = {
      key: "no_bank",
      icon: "link-outline",
      color: "#6366F1",
      title: t("dashboard.nudge.noBank.title"),
      body: t("dashboard.nudge.noBank.body"),
      action: t("dashboard.nudge.noBank.action"),
      onAction: () => router.push("/(tabs)/accounts")
    };
  }

  if (
  !nudge &&
  !isDismissed("no_budget") &&
  Object.keys(limits).length === 0 &&
  accounts.length > 0)
  {
    nudge = {
      key: "no_budget",
      icon: "wallet-outline",
      color: "#F59E0B",
      title: t("dashboard.nudge.noBudget.title"),
      body: t("dashboard.nudge.noBudget.body"),
      action: t("dashboard.nudge.noBudget.action"),
      onAction: () => router.push("/(tabs)/budget")
    };
  }

  if (!nudge && !isDismissed("budget_warning")) {
    const warned = budgetSummary.find(
      (b) => b.percentage >= 80 && b.status !== "over"
    );
    if (warned) {
      const now2 = new Date();
      const endOfMonth = new Date(now2.getFullYear(), now2.getMonth() + 1, 0);
      const daysLeft = Math.ceil((endOfMonth - now2) / 86400000);
      nudge = {
        key: "budget_warning",
        icon: "warning-outline",
        color: "#F59E0B",
        title: t("dashboard.nudge.budgetWarning.title", {
          category: t(`analytics.categories.${warned.key}`)
        }),
        body: t("dashboard.nudge.budgetWarning.body", {
          pct: warned.percentage,
          days: daysLeft
        }),
        action: t("dashboard.nudge.budgetWarning.action"),
        onAction: () => router.push("/(tabs)/budget")
      };
    }
  }

  if (
  !nudge &&
  !isDismissed("savings_low") &&
  profile?.goal === "savings" &&
  totalIncome > 0)
  {
    const rate = Math.round(
      (totalIncome - totalExpenses) / totalIncome * 100
    );
    if (rate < 20) {
      nudge = {
        key: "savings_low",
        icon: "trending-up-outline",
        color: "#10B981",
        title: t("dashboard.nudge.savingsLow.title"),
        body: t("dashboard.nudge.savingsLow.body", { rate: Math.max(rate, 0) }),
        action: t("dashboard.nudge.savingsLow.action"),
        onAction: () => router.push("/(tabs)/advisor")
      };
    }
  }

  if (!nudge && !isDismissed("unbudgeted") && accounts.length > 0) {
    const unbudgetedBig = CATEGORIES.find(
      (cat) => !limits[cat.key] && (currentMonthSpending[cat.key] || 0) > 200
    );
    if (unbudgetedBig) {
      nudge = {
        key: "unbudgeted",
        icon: "alert-circle-outline",
        color: "#EF4444",
        title: t("dashboard.nudge.unbudgetedSpending.title", {
          category: t(`analytics.categories.${unbudgetedBig.key}`)
        }),
        body: t("dashboard.nudge.unbudgetedSpending.body", {
          amount: Math.round(currentMonthSpending[unbudgetedBig.key] || 0),
          category: t(`analytics.categories.${unbudgetedBig.key}`)
        }),
        action: t("dashboard.nudge.unbudgetedSpending.action"),
        onAction: () => router.push("/(tabs)/budget")
      };
    }
  }

  if (!nudge) return null;

  return (
    <View
      style={{
        backgroundColor: `${nudge.color}12`,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: `${nudge.color}35`,
        padding: 14,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "flex-start"
      }}>
      
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: `${nudge.color}20`,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          marginTop: 2
        }}>
        
        <Ionicons name={nudge.icon} size={18} color={nudge.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: c.foreground,
            fontWeight: "700",
            fontSize: 13,
            marginBottom: 3
          }}>
          
          {nudge.title}
        </Text>
        <Text
          style={{
            color: c.textMuted,
            fontSize: 12,
            lineHeight: 17,
            marginBottom: 8
          }}>
          
          {nudge.body}
        </Text>
        <Pressable
          onPress={nudge.onAction}
          style={{
            alignSelf: "flex-start",
            backgroundColor: nudge.color,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 8
          }}>
          
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 12 }}>
            {nudge.action}
          </Text>
        </Pressable>
      </View>
      <Pressable
        onPress={() => dismiss(nudge.key)}
        style={{ padding: 4, marginLeft: 4 }}
        hitSlop={8}>
        
        <Ionicons name="close" size={16} color={c.textMuted} />
      </Pressable>
    </View>);

}