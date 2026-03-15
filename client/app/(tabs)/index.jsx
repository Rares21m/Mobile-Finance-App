import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import InboxModal from "../../components/InboxModal";
import SectionHeader from "../../components/SectionHeader";
import TransactionItem from "../../components/TransactionItem";
import { useAuth } from "../../context/AuthContext";
import { useBankData } from "../../context/BankContext";
import { useBudget } from "../../context/BudgetContext";
import { useGoals } from "../../context/GoalsContext";
import { useNotifications } from "../../context/NotificationsContext";
import { useOnboarding } from "../../context/OnboardingContext";
import { useTheme } from "../../context/ThemeContext";
import i18n from "../../i18n/i18n";
import {
    checkAndNotifyBudgets,
    saveToInbox,
} from "../../services/NotificationService";
import {
    CATEGORIES,
    filterByPeriod,
    getCategoryBreakdown,
} from "../../utils/categoryUtils";

// ─── GoalInsightCard ──────────────────────────────────────────────────────────
// Shows a personalised insight widget under the balance card based on the
// financial goal the user chose during onboarding.
function GoalInsightCard({
  goal,
  totalIncome,
  totalExpenses,
  totalBudgeted,
  categoryBreakdown,
  lastMonthBreakdown,
  savingsGoals,
  c,
  t,
}) {
  let icon = "bulb-outline";
  let accentColor = c.primary;
  let title = "";
  let body = null;

  if (goal === "savings") {
    icon = "wallet-outline";
    const rate =
      totalIncome > 0
        ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)
        : 0;
    const barPct = Math.min(Math.max(rate, 0), 100);
    const isGood = rate >= 20;
    accentColor = isGood ? c.success : "#F59E0B";

    const activeGoals = (savingsGoals || []).filter(
      (g) => parseFloat(g.savedAmount) < parseFloat(g.targetAmount),
    );

    if (activeGoals.length > 0) {
      title = t("dashboard.goalInsight.savings.goalsTitle");
      body = (
        <View>
          {activeGoals.slice(0, 3).map((g) => {
            const target = parseFloat(g.targetAmount);
            const saved = parseFloat(g.savedAmount);
            const pct =
              target > 0
                ? Math.min(Math.round((saved / target) * 100), 100)
                : 0;
            const goalColor = g.color || "#10B981";
            return (
              <View key={g.id} style={{ marginBottom: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 5,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      backgroundColor: `${goalColor}22`,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                    }}
                  >
                    <Ionicons
                      name={g.icon || "star-outline"}
                      size={13}
                      color={goalColor}
                    />
                  </View>
                  <Text
                    style={{
                      color: c.foreground,
                      fontSize: 13,
                      fontWeight: "600",
                      flex: 1,
                    }}
                  >
                    {g.name}
                  </Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>
                    {saved.toLocaleString("ro-RO", {
                      minimumFractionDigits: 0,
                    })}
                    {" / "}
                    {target.toLocaleString("ro-RO", {
                      minimumFractionDigits: 0,
                    })}{" "}
                    RON
                  </Text>
                </View>
                <View
                  style={{
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: c.border,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: 5,
                      width: `${pct}%`,
                      borderRadius: 3,
                      backgroundColor: goalColor,
                    }}
                  />
                </View>
                <Text
                  style={{
                    color: goalColor,
                    fontSize: 11,
                    marginTop: 2,
                    fontWeight: "600",
                    textAlign: "right",
                  }}
                >
                  {pct}%
                </Text>
              </View>
            );
          })}
          {totalIncome > 0 && (
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4 }}>
              {t("dashboard.goalInsight.savings.desc", {
                rate: Math.max(rate, 0),
              })}
            </Text>
          )}
        </View>
      );
    } else {
      title = t("dashboard.goalInsight.savings.title");
      body = (
        <View>
          <Text style={{ color: c.textMuted, fontSize: 13, marginBottom: 8 }}>
            {t("dashboard.goalInsight.savings.desc", {
              rate: Math.max(rate, 0),
            })}
          </Text>
          {/* Progress bar */}
          <View
            style={{
              height: 6,
              borderRadius: 4,
              backgroundColor: c.border,
              overflow: "hidden",
              marginBottom: 6,
            }}
          >
            <View
              style={{
                height: 6,
                width: `${barPct}%`,
                borderRadius: 4,
                backgroundColor: accentColor,
              }}
            />
          </View>
          <Text style={{ color: c.textMuted, fontSize: 11 }}>
            {t("dashboard.goalInsight.savings.tip")}
          </Text>
        </View>
      );
    }
  } else if (goal === "expense_control") {
    const top = categoryBreakdown[0];
    if (!top) return null;
    const lastMonthTop = lastMonthBreakdown.find((c) => c.key === top.key);
    const lastAmt = lastMonthTop?.total || 0;
    let trendKey = "same";
    let trendPct = 0;
    if (lastAmt > 0) {
      trendPct = Math.round(((top.total - lastAmt) / lastAmt) * 100);
      if (trendPct > 5) trendKey = "up";
      else if (trendPct < -5) trendKey = "down";
    }
    icon = "trending-up-outline";
    accentColor = trendKey === "up" ? c.expense : c.success;
    title = t("dashboard.goalInsight.expense_control.title");
    body = (
      <View>
        <Text style={{ color: c.textMuted, fontSize: 13, marginBottom: 4 }}>
          {t("dashboard.goalInsight.expense_control.desc", {
            category: t(`analytics.categories.${top.key}`),
            amount: top.total.toLocaleString("ro-RO", {
              minimumFractionDigits: 2,
            }),
          })}
        </Text>
        <Text style={{ color: accentColor, fontSize: 12, fontWeight: "600" }}>
          {trendKey === "up"
            ? t("dashboard.goalInsight.expense_control.up", {
                pct: Math.abs(trendPct),
              })
            : trendKey === "down"
              ? t("dashboard.goalInsight.expense_control.down", {
                  pct: Math.abs(trendPct),
                })
              : t("dashboard.goalInsight.expense_control.same")}
        </Text>
      </View>
    );
  } else if (goal === "investment") {
    const surplus = Math.max(totalIncome - totalExpenses - totalBudgeted, 0);
    icon = "podium-outline";
    accentColor = c.primary;
    title = t("dashboard.goalInsight.investment.title");
    body = (
      <Text style={{ color: c.textMuted, fontSize: 13 }}>
        {t("dashboard.goalInsight.investment.desc", {
          amount: surplus.toLocaleString("ro-RO", { minimumFractionDigits: 2 }),
        })}
      </Text>
    );
  } else if (goal === "debt_freedom") {
    const DISCRETIONARY = ["shopping", "entertainment", "other"];
    const discretionary = categoryBreakdown
      .filter((cat) => DISCRETIONARY.includes(cat.key))
      .reduce((s, cat) => s + cat.total, 0);
    icon = "cut-outline";
    accentColor = "#F59E0B";
    title = t("dashboard.goalInsight.debt_freedom.title");
    body = (
      <Text style={{ color: c.textMuted, fontSize: 13 }}>
        {t("dashboard.goalInsight.debt_freedom.desc", {
          amount: discretionary.toLocaleString("ro-RO", {
            minimumFractionDigits: 2,
          }),
        })}
      </Text>
    );
  }

  if (!body) return null;

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: c.border,
        padding: 16,
        marginBottom: 20,
        borderLeftWidth: 3,
        borderLeftColor: accentColor,
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: accentColor + "22",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons name={icon} size={17} color={accentColor} />
        </View>
        <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 14 }}>
          {title}
        </Text>
      </View>
      {body}
    </View>
  );
}

// ─── BudgetAlerts ─────────────────────────────────────────────────────────────
// Shows inline alert cards for budget categories that are at ≥75% or ≥100%.
function BudgetAlerts({ alerts, router, c, t }) {
  if (alerts.length === 0) return null;
  return (
    <View style={{ marginBottom: 20 }}>
      {alerts.map((alert) => {
        const isOver = alert.status === "over";
        const color = isOver ? c.expense : "#F59E0B";
        const icon = isOver ? "alert-circle" : "warning";
        return (
          <Pressable
            key={alert.key}
            onPress={() => router.push("/(tabs)/budget")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: color + "18",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: color + "55",
              padding: 12,
              marginBottom: 8,
            }}
          >
            <Ionicons
              name={icon}
              size={20}
              color={color}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: c.foreground, fontWeight: "600", fontSize: 13 }}
              >
                {isOver
                  ? t("dashboard.budgetAlert.over", {
                      category: t(`analytics.categories.${alert.key}`),
                    })
                  : t("dashboard.budgetAlert.warning", {
                      category: t(`analytics.categories.${alert.key}`),
                      pct: alert.percentage,
                    })}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>
                {t("dashboard.budgetAlert.tapToManage")}
              </Text>
            </View>
            <Text
              style={{ color, fontWeight: "700", fontSize: 14, marginLeft: 8 }}
            >
              {alert.percentage}%
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── NudgeCard ────────────────────────────────────────────────────────────────
// Computes and shows the most relevant contextual financial nudge.
// Each nudge type has a 24-hour dismiss cooldown stored in AsyncStorage.
const NUDGE_DISMISS_KEY = "nudge_dismissed_v1";

function NudgeCard({
  accounts,
  limits,
  currentMonthSpending,
  profile,
  budgetSummary,
  totalIncome,
  totalExpenses,
  router,
  c,
  t,
}) {
  const [dismissedUntil, setDismissedUntil] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(NUDGE_DISMISS_KEY)
      .then((raw) => {
        if (raw) setDismissedUntil(JSON.parse(raw));
      })
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  const now = Date.now();
  const isDismissed = (key) => dismissedUntil[key] && now < dismissedUntil[key];

  const dismiss = async (key) => {
    const updated = { ...dismissedUntil, [key]: now + 24 * 60 * 60 * 1000 };
    setDismissedUntil(updated);
    await AsyncStorage.setItem(NUDGE_DISMISS_KEY, JSON.stringify(updated));
  };

  // Compute which nudge to show (priority order)
  let nudge = null;

  // 1. No bank connected
  if (!nudge && !isDismissed("no_bank") && accounts.length === 0) {
    nudge = {
      key: "no_bank",
      icon: "link-outline",
      color: "#6366F1",
      title: t("dashboard.nudge.noBank.title"),
      body: t("dashboard.nudge.noBank.body"),
      action: t("dashboard.nudge.noBank.action"),
      onAction: () => router.push("/(tabs)/accounts"),
    };
  }

  // 2. No budgets set
  if (
    !nudge &&
    !isDismissed("no_budget") &&
    Object.keys(limits).length === 0 &&
    accounts.length > 0
  ) {
    nudge = {
      key: "no_budget",
      icon: "wallet-outline",
      color: "#F59E0B",
      title: t("dashboard.nudge.noBudget.title"),
      body: t("dashboard.nudge.noBudget.body"),
      action: t("dashboard.nudge.noBudget.action"),
      onAction: () => router.push("/(tabs)/budget"),
    };
  }

  // 3. Budget warning (≥80% spent)
  if (!nudge && !isDismissed("budget_warning")) {
    const warned = budgetSummary.find(
      (b) => b.percentage >= 80 && b.status !== "over",
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
          category: t(`analytics.categories.${warned.key}`),
        }),
        body: t("dashboard.nudge.budgetWarning.body", {
          pct: warned.percentage,
          days: daysLeft,
        }),
        action: t("dashboard.nudge.budgetWarning.action"),
        onAction: () => router.push("/(tabs)/budget"),
      };
    }
  }

  // 4. Savings rate low (savings goal)
  if (
    !nudge &&
    !isDismissed("savings_low") &&
    profile?.goal === "savings" &&
    totalIncome > 0
  ) {
    const rate = Math.round(
      ((totalIncome - totalExpenses) / totalIncome) * 100,
    );
    if (rate < 20) {
      nudge = {
        key: "savings_low",
        icon: "trending-up-outline",
        color: "#10B981",
        title: t("dashboard.nudge.savingsLow.title"),
        body: t("dashboard.nudge.savingsLow.body", { rate: Math.max(rate, 0) }),
        action: t("dashboard.nudge.savingsLow.action"),
        onAction: () => router.push("/(tabs)/advisor"),
      };
    }
  }

  // 5. Unbudgeted category with significant spending (>200 RON)
  if (!nudge && !isDismissed("unbudgeted") && accounts.length > 0) {
    const unbudgetedBig = CATEGORIES.find(
      (cat) => !limits[cat.key] && (currentMonthSpending[cat.key] || 0) > 200,
    );
    if (unbudgetedBig) {
      nudge = {
        key: "unbudgeted",
        icon: "alert-circle-outline",
        color: "#EF4444",
        title: t("dashboard.nudge.unbudgetedSpending.title", {
          category: t(`analytics.categories.${unbudgetedBig.key}`),
        }),
        body: t("dashboard.nudge.unbudgetedSpending.body", {
          amount: Math.round(currentMonthSpending[unbudgetedBig.key] || 0),
          category: t(`analytics.categories.${unbudgetedBig.key}`),
        }),
        action: t("dashboard.nudge.unbudgetedSpending.action"),
        onAction: () => router.push("/(tabs)/budget"),
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
        alignItems: "flex-start",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: `${nudge.color}20`,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          marginTop: 2,
        }}
      >
        <Ionicons name={nudge.icon} size={18} color={nudge.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: c.foreground,
            fontWeight: "700",
            fontSize: 13,
            marginBottom: 3,
          }}
        >
          {nudge.title}
        </Text>
        <Text
          style={{
            color: c.textMuted,
            fontSize: 12,
            lineHeight: 17,
            marginBottom: 8,
          }}
        >
          {nudge.body}
        </Text>
        <Pressable
          onPress={nudge.onAction}
          style={{
            alignSelf: "flex-start",
            backgroundColor: nudge.color,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 12 }}>
            {nudge.action}
          </Text>
        </Pressable>
      </View>
      <Pressable
        onPress={() => dismiss(nudge.key)}
        style={{ padding: 4, marginLeft: 4 }}
        hitSlop={8}
      >
        <Ionicons name="close" size={16} color={c.textMuted} />
      </Pressable>
    </View>
  );
}

// ─── MonthlyCheckIn ───────────────────────────────────────────────────────────
// A 2-screen modal that appears once per month summarising last month and
// offering to adjust budgets. Supports a 3-day "remind me later" snooze.
const CHECKIN_KEY = "monthly_checkin_v1";

function MonthlyCheckIn({
  transactions,
  budgetSummary,
  limits,
  applySuggestedBudgets,
  getSuggestedBudgets,
  profile,
  c,
  t,
}) {
  const [visible, setVisible] = useState(false);
  const [screen, setScreen] = useState(0); // 0 = summary, 1 = adjust

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CHECKIN_KEY);
        const data = raw ? JSON.parse(raw) : {};
        const now = Date.now();
        if (data.snoozeUntil && now < data.snoozeUntil) return;
        const currentMonth = new Date().getMonth();
        if (data.lastShownMonth === currentMonth) return;
        // Only show if user has some financial data
        if (transactions.length > 0) {
          setVisible(true);
          await AsyncStorage.setItem(
            CHECKIN_KEY,
            JSON.stringify({
              ...data,
              lastShownMonth: currentMonth,
            }),
          );
          // Persist a check-in entry to the Inbox
          const monthName = new Date(
            new Date().getFullYear(),
            new Date().getMonth() - 1,
            1,
          ).toLocaleString(
            i18n.language?.startsWith("ro") ? "ro-RO" : "en-US",
            { month: "long" },
          );
          saveToInbox({
            type: "monthly_checkin",
            title: t("dashboard.checkin.title", { month: monthName }),
            body: t("dashboard.checkin.subtitle"),
          });
        }
      } catch {
        /* ignore */
      }
    })();
  }, [transactions.length]);

  const dismiss = async (snooze = false) => {
    setVisible(false);
    setScreen(0);
    if (snooze) {
      const data = { snoozeUntil: Date.now() + 3 * 24 * 60 * 60 * 1000 };
      await AsyncStorage.setItem(CHECKIN_KEY, JSON.stringify(data));
    }
  };

  const lastMonthTx = filterByPeriod(transactions, 1);
  const lastMonthIncome = lastMonthTx
    .filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) > 0)
    .reduce((s, tx) => s + parseFloat(tx.transactionAmount?.amount || 0), 0);
  const lastMonthExpenses = lastMonthTx
    .filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0)
    .reduce(
      (s, tx) => s + Math.abs(parseFloat(tx.transactionAmount?.amount || 0)),
      0,
    );
  const lastMonthSaved = Math.max(lastMonthIncome - lastMonthExpenses, 0);
  const topCats = getCategoryBreakdown(lastMonthTx).slice(0, 3);

  const lastMonthName = new Date(
    new Date().getFullYear(),
    new Date().getMonth() - 1,
    1,
  ).toLocaleString(i18n.language?.startsWith("ro") ? "ro-RO" : "en-US", {
    month: "long",
  });

  const suggestions = profile ? getSuggestedBudgets(profile) : [];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => dismiss()}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#00000088",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            paddingBottom: 48,
          }}
        >
          {screen === 0 ? (
            <>
              {/* Screen 1: Last month summary */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: `${c.primary}20`,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={c.primary}
                  />
                </View>
                <Text
                  style={{
                    color: c.foreground,
                    fontWeight: "800",
                    fontSize: 18,
                    flex: 1,
                  }}
                >
                  {t("dashboard.checkin.title", { month: lastMonthName })}
                </Text>
                <Pressable onPress={() => dismiss()} hitSlop={8}>
                  <Ionicons name="close" size={22} color={c.textMuted} />
                </Pressable>
              </View>
              <Text
                style={{ color: c.textMuted, fontSize: 13, marginBottom: 20 }}
              >
                {t("dashboard.checkin.subtitle")}
              </Text>

              {/* Stats row */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
                {[
                  {
                    label: t("dashboard.checkin.spent"),
                    value: lastMonthExpenses,
                    color: c.expense,
                  },
                  {
                    label: t("dashboard.checkin.income"),
                    value: lastMonthIncome,
                    color: c.primary,
                  },
                  {
                    label: t("dashboard.checkin.saved"),
                    value: lastMonthSaved,
                    color: "#10B981",
                  },
                ].map((stat) => (
                  <View
                    key={stat.label}
                    style={{
                      flex: 1,
                      backgroundColor: c.card,
                      borderRadius: 14,
                      padding: 12,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: c.border,
                    }}
                  >
                    <Text
                      style={{
                        color: stat.color,
                        fontWeight: "800",
                        fontSize: 16,
                      }}
                    >
                      {Math.round(stat.value)}
                    </Text>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontSize: 10,
                        textAlign: "center",
                        marginTop: 2,
                      }}
                    >
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Top categories */}
              {topCats.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={{
                      color: c.foreground,
                      fontWeight: "700",
                      fontSize: 14,
                      marginBottom: 10,
                    }}
                  >
                    {t("dashboard.checkin.topCategories")}
                  </Text>
                  {topCats.map((cat) => (
                    <View
                      key={cat.key}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          backgroundColor: `${cat.color}18`,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 10,
                        }}
                      >
                        <Ionicons name={cat.icon} size={15} color={cat.color} />
                      </View>
                      <Text
                        style={{ color: c.foreground, fontSize: 13, flex: 1 }}
                      >
                        {t(`analytics.categories.${cat.key}`)}
                      </Text>
                      <Text
                        style={{
                          color: c.foreground,
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        {Math.round(cat.total)} RON
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {suggestions.length > 0 ? (
                <Pressable
                  onPress={() => setScreen(1)}
                  style={{
                    backgroundColor: c.primary,
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}
                  >
                    {t("dashboard.checkin.adjustTitle")} →
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => dismiss(true)}
                style={{ alignItems: "center", paddingVertical: 8 }}
              >
                <Text style={{ color: c.textMuted, fontSize: 13 }}>
                  {t("dashboard.checkin.remindLater")}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              {/* Screen 2: Budget adjustments */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Pressable
                  onPress={() => setScreen(0)}
                  hitSlop={8}
                  style={{ marginRight: 10 }}
                >
                  <Ionicons name="arrow-back" size={22} color={c.textMuted} />
                </Pressable>
                <Text
                  style={{
                    color: c.foreground,
                    fontWeight: "800",
                    fontSize: 18,
                    flex: 1,
                  }}
                >
                  {t("dashboard.checkin.adjustTitle")}
                </Text>
              </View>
              <Text
                style={{ color: c.textMuted, fontSize: 13, marginBottom: 20 }}
              >
                {t("dashboard.checkin.adjustSubtitle")}
              </Text>
              {suggestions.slice(0, 5).map((s) => {
                const cat = [
                  { key: "food", icon: "restaurant", color: "#F59E0B" },
                  { key: "transport", icon: "car", color: "#3B82F6" },
                  { key: "shopping", icon: "bag-handle", color: "#EC4899" },
                  { key: "utilities", icon: "flash", color: "#8B5CF6" },
                  { key: "housing", icon: "home", color: "#14B8A6" },
                  {
                    key: "entertainment",
                    icon: "game-controller",
                    color: "#F97316",
                  },
                  { key: "health", icon: "medkit", color: "#EF4444" },
                  {
                    key: "other",
                    icon: "ellipsis-horizontal",
                    color: "#6B7280",
                  },
                ].find((x) => x.key === s.key) || {
                  icon: "ellipsis-horizontal",
                  color: "#6B7280",
                };
                return (
                  <View
                    key={s.key}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 8,
                      borderBottomWidth: 0.5,
                      borderBottomColor: c.border,
                    }}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={16}
                      color={cat.color}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={{ color: c.foreground, fontSize: 14, flex: 1 }}
                    >
                      {t(`analytics.categories.${s.key}`)}
                    </Text>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontSize: 11,
                        marginRight: 8,
                      }}
                    >
                      {limits[s.key] ? `${Math.round(limits[s.key])} → ` : ""}
                    </Text>
                    <Text
                      style={{
                        color: c.foreground,
                        fontWeight: "700",
                        fontSize: 14,
                      }}
                    >
                      {Math.round(s.suggestedLimit)} RON
                    </Text>
                  </View>
                );
              })}
              <Pressable
                onPress={() => {
                  applySuggestedBudgets(suggestions);
                  dismiss();
                }}
                style={{
                  backgroundColor: c.primary,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                  marginTop: 20,
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}
                >
                  {t("dashboard.checkin.accept")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => dismiss()}
                style={{ alignItems: "center", paddingVertical: 8 }}
              >
                <Text style={{ color: c.textMuted, fontSize: 13 }}>
                  {t("dashboard.checkin.dismiss")}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function Dashboard() {
  const { isDark, theme } = useTheme();
  const c = theme.colors;
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const { profile } = useOnboarding();
  const { goals } = useGoals();
  const {
    getBudgetSummary,
    totalBudgeted,
    limits,
    currentMonthSpending,
    getSuggestedBudgets,
    applySuggestedBudgets,
  } = useBudget();
  const {
    accounts,
    transactions,
    loading,
    sessionExpired,
    getTotalBalance,
    getRecentTransactions,
  } = useBankData();

  const totalBalance = getTotalBalance();
  const recentTransactions = getRecentTransactions(5);

  // Monthly calculations
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTx = transactions.filter((tx) => {
    const d = new Date(tx.bookingDate || tx.valueDate);
    return d >= monthStart && d <= now;
  });

  const totalIncome = monthlyTx
    .filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) > 0)
    .reduce(
      (sum, tx) => sum + parseFloat(tx.transactionAmount?.amount || 0),
      0,
    );

  const totalExpenses = monthlyTx
    .filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0)
    .reduce(
      (sum, tx) =>
        sum + Math.abs(parseFloat(tx.transactionAmount?.amount || 0)),
      0,
    );

  const currentLang = i18n.language?.startsWith("ro") ? "ro" : "en";

  // Top spending categories
  const categoryBreakdown = getCategoryBreakdown(monthlyTx).slice(0, 3);

  // Last-month spending breakdown (for expense_control goal)
  const lastMonthTx = filterByPeriod(transactions, 1);
  const lastMonthBreakdown = getCategoryBreakdown(lastMonthTx);

  // Budget alerts: categories at warning or over limit
  const budgetAlerts = getBudgetSummary().filter(
    (b) => b.status === "warning" || b.status === "over",
  );

  // Fire local notifications when budget data changes
  useEffect(() => {
    const summary = getBudgetSummary();
    if (summary.length > 0) {
      checkAndNotifyBudgets(summary, t).catch(() => {});
    }
  }, [transactions]); // re-run whenever transactions sync

  const hasData = accounts.length > 0 || transactions.length > 0;

  // Date formatted — respects current language
  const locale = currentLang === "ro" ? "ro-RO" : "en-US";
  const dateStr = now.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // First name only for greeting
  const firstName = user?.name?.split(" ")[0] || t("profile.defaultUser");

  const quickActions = [
    {
      key: "accounts",
      icon: "link-outline",
      label: t("accounts.connectNow"),
      onPress: () => router.push("/(tabs)/accounts"),
    },
    {
      key: "budget",
      icon: "wallet-outline",
      label: t("dashboard.nudge.noBudget.action"),
      onPress: () => router.push("/(tabs)/budget"),
    },
    {
      key: "transactions",
      icon: "receipt-outline",
      label: t("dashboard.seeAll"),
      onPress: () => router.push("/transactions"),
    },
  ];

  // ─── Inbox ──────────────────────────────────────────────────────────────────
  const { unreadCount, reload: reloadInbox } = useNotifications();
  const [inboxVisible, setInboxVisible] = useState(false);

  // Re-read the inbox whenever the screen comes to the foreground or
  // after budget notifications may have been created
  useEffect(() => {
    reloadInbox();
  }, [transactions]);

  return (
    <View className="flex-1 bg-background">
      {/* ===== MONTHLY CHECK-IN MODAL ===== */}
      <MonthlyCheckIn
        transactions={transactions}
        budgetSummary={budgetAlerts}
        limits={limits}
        applySuggestedBudgets={applySuggestedBudgets}
        getSuggestedBudgets={getSuggestedBudgets}
        profile={profile}
        c={c}
        t={t}
      />
      {/* ===== INBOX MODAL ===== */}
      <InboxModal
        visible={inboxVisible}
        onClose={() => setInboxVisible(false)}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== HEADER ===== */}
        <View className="px-6 pt-14 pb-1 flex-row items-center justify-between">
          <View>
            <Text className="text-text-muted text-sm capitalize">
              {dateStr}
            </Text>
          </View>
          {/* Right side: bell + profile pill */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {/* ── Bell / Inbox button ── */}
            <Pressable
              onPress={() => setInboxVisible(true)}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons
                name={
                  unreadCount > 0 ? "notifications" : "notifications-outline"
                }
                size={20}
                color={unreadCount > 0 ? c.primary : c.textMuted}
              />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: 5,
                    right: 5,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#F43F5E",
                    borderWidth: 1.5,
                    borderColor: c.background,
                  }}
                />
              )}
            </Pressable>

            {/* ── Profile pill ── */}
            <Pressable
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 8,
                opacity: pressed ? 0.7 : 1,
              })}
              onPress={() => router.push("/(tabs)/profile")}
            >
              <Text className="text-foreground text-sm font-semibold mr-2">
                {firstName}
              </Text>
              <View className="w-8 h-8 rounded-xl overflow-hidden">
                <LinearGradient
                  colors={["#10B981", "#6366F1"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 32,
                    height: 32,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="person" size={15} color="#fff" />
                </LinearGradient>
              </View>
            </Pressable>
          </View>
          {/* end right-side group */}
        </View>

        {!hasData ? (
          /* ===== EMPTY STATE ===== */
          <View className="px-6 mt-4">
            {/* Balance placeholder */}
            <View className="rounded-3xl overflow-hidden mb-5">
              <LinearGradient
                colors={c.emptyCardGradient}
                style={{
                  padding: 28,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <Text className="text-text-muted text-sm">
                  {t("dashboard.totalBalance")}
                </Text>
                <Text className="text-foreground text-4xl font-extrabold mt-2">
                  — RON
                </Text>
              </LinearGradient>
            </View>

            {/* Connect CTA */}
            <View className="bg-primary/[0.06] rounded-3xl p-7 border border-primary/15 items-center">
              <View className="w-16 h-16 rounded-2xl overflow-hidden mb-4">
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={{
                    width: 64,
                    height: 64,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="link" size={28} color="#fff" />
                </LinearGradient>
              </View>
              <Text className="text-foreground font-bold text-lg text-center">
                {t("dashboard.connectFirst")}
              </Text>
              <Text className="text-text-muted text-sm mt-3 text-center leading-5">
                {t("dashboard.connectFirstDesc")}
              </Text>
            </View>
          </View>
        ) : (
          /* ===== MAIN CONTENT ===== */
          <View className="px-6">
            {/* ===== BALANCE CARD ===== */}
            <View
              className="rounded-3xl overflow-hidden mt-4 mb-5"
              style={{
                backgroundColor: c.card,
                borderWidth: 1,
                borderColor: c.balanceCardBorder,
              }}
            >
              {/* Accent strip */}
              <LinearGradient
                colors={[c.primary, c.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 3 }}
              />

              <View style={{ padding: 28 }}>
                <Text className="text-text-muted text-sm font-medium">
                  {t("dashboard.totalBalance")}
                </Text>
                <Text className="text-foreground text-4xl font-extrabold mt-2">
                  {totalBalance.toLocaleString("ro-RO", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  <Text className="text-text-muted text-lg font-normal">
                    RON
                  </Text>
                </Text>

                {/* Account badge */}
                {accounts[0] && (
                  <View className="flex-row items-center mt-3 bg-primary/[0.08] rounded-xl px-3 py-2 self-start">
                    <Ionicons name="business" size={14} color={c.primary} />
                    <Text className="text-text-muted text-xs ml-2 font-medium">
                      {accounts[0].name || "Banca Transilvania"}
                    </Text>
                  </View>
                )}

                {/* Income / Expenses row */}
                <View className="flex-row mt-5 pt-4 border-t border-border">
                  <View className="flex-1 flex-row items-center">
                    <View
                      className="w-8 h-8 rounded-lg items-center justify-center mr-2"
                      style={{ backgroundColor: c.primary + "26" }}
                    >
                      <Ionicons name="arrow-down" size={16} color={c.primary} />
                    </View>
                    <View>
                      <Text className="text-text-muted text-xs">
                        {t("dashboard.income")}
                      </Text>
                      <Text className="text-foreground font-bold text-sm">
                        +
                        {totalIncome.toLocaleString("ro-RO", {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-1 flex-row items-center">
                    <View
                      className="w-8 h-8 rounded-lg items-center justify-center mr-2"
                      style={{ backgroundColor: c.expense + "26" }}
                    >
                      <Ionicons name="arrow-up" size={16} color={c.expense} />
                    </View>
                    <View>
                      <Text className="text-text-muted text-xs">
                        {t("dashboard.expenses")}
                      </Text>
                      <Text className="text-foreground font-bold text-sm">
                        -
                        {totalExpenses.toLocaleString("ro-RO", {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* ===== ALERTS ===== */}
            {sessionExpired && (
              <Pressable
                onPress={() => router.push("/(tabs)/accounts")}
                className="active:opacity-80"
                style={{
                  backgroundColor: `${c.warning}14`,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: `${c.warning}40`,
                  padding: 12,
                  marginBottom: 10,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={c.warning}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 13 }}>
                    {t("accounts.sessionExpired")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.warning} />
              </Pressable>
            )}

            {budgetAlerts.length > 0 && (
              <BudgetAlerts alerts={budgetAlerts} router={router} c={c} t={t} />
            )}

            <NudgeCard
              accounts={accounts}
              limits={limits}
              currentMonthSpending={currentMonthSpending}
              profile={profile}
              budgetSummary={budgetAlerts}
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              router={router}
              c={c}
              t={t}
            />

            {/* ===== QUICK ACTIONS ===== */}
            <View className="mb-6">
              <SectionHeader title={t("dashboard.quickActions")} />
              <View style={{ flexDirection: "row", gap: 10 }}>
                {quickActions.map((action) => (
                  <Pressable
                    key={action.key}
                    onPress={action.onPress}
                    className="active:opacity-80"
                    style={{
                      flex: 1,
                      backgroundColor: c.surface,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: c.border,
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 10,
                        backgroundColor: `${c.primary}18`,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 6,
                      }}
                    >
                      <Ionicons name={action.icon} size={16} color={c.primary} />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{ color: c.foreground, fontWeight: "600", fontSize: 12 }}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* ===== DETAILS ===== */}
            {profile?.goal &&
              (totalIncome > 0 ||
                (profile.goal === "savings" && goals.length > 0)) && (
                <GoalInsightCard
                  goal={profile.goal}
                  totalIncome={totalIncome}
                  totalExpenses={totalExpenses}
                  totalBudgeted={totalBudgeted}
                  categoryBreakdown={categoryBreakdown}
                  lastMonthBreakdown={lastMonthBreakdown}
                  savingsGoals={goals}
                  c={c}
                  t={t}
                />
              )}

            {/* ===== SPENDING INSIGHTS ===== */}
            {categoryBreakdown.length > 0 && (
              <View className="mb-7">
                <SectionHeader
                  title={t("dashboard.spendingInsights")}
                  rightText={t("dashboard.thisMonth")}
                />
                <View className="bg-surface rounded-2xl border border-border p-4">
                  {/* Total bar background */}
                  <View className="h-3 rounded-full bg-background overflow-hidden flex-row mb-4">
                    {categoryBreakdown.map((cat) => (
                      <View
                        key={cat.key}
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.color,
                          borderRadius: 6,
                        }}
                      />
                    ))}
                  </View>

                  {/* Category list */}
                  {categoryBreakdown.map((cat, idx) => (
                    <View
                      key={cat.key}
                      className={`flex-row items-center py-2.5 ${
                        idx < categoryBreakdown.length - 1
                          ? "border-b border-border"
                          : ""
                      }`}
                    >
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center mr-3"
                        style={{
                          backgroundColor: `${cat.color}18`,
                        }}
                      >
                        <Ionicons name={cat.icon} size={16} color={cat.color} />
                      </View>
                      <Text className="text-foreground text-sm font-medium flex-1">
                        {t(`analytics.categories.${cat.key}`)}
                      </Text>
                      <Text className="text-text-muted text-xs mr-3">
                        {cat.percentage}%
                      </Text>
                      <Text className="text-foreground font-semibold text-sm">
                        {cat.total.toLocaleString("ro-RO", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        <Text className="text-text-muted text-xs font-normal">
                          {t("common.currency")}
                        </Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ===== RECENT TRANSACTIONS ===== */}
            <SectionHeader
              title={t("dashboard.recentTransactions")}
              rightText={t("dashboard.seeAll")}
              onPress={() => router.push("/transactions")}
            />

            {recentTransactions.length === 0 && (
              <Text className="text-text-muted text-sm">
                {t("dashboard.noTransactions")}
              </Text>
            )}

            <View className="bg-surface rounded-2xl border border-border overflow-hidden">
              {recentTransactions.map((tx, index) => (
                <TransactionItem
                  key={`${tx.connectionId || ""}-${tx.transactionId || index}`}
                  tx={tx}
                  isLast={index === recentTransactions.length - 1}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
