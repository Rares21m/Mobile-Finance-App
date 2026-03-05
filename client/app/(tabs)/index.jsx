import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";
import SectionHeader from "../../components/SectionHeader";
import TransactionItem from "../../components/TransactionItem";
import { useAuth } from "../../context/AuthContext";
import { useBankData } from "../../context/BankContext";
import { useBudget } from "../../context/BudgetContext";
import { useOnboarding } from "../../context/OnboardingContext";
import { useTheme } from "../../context/ThemeContext";
import i18n from "../../i18n/i18n";
import { checkAndNotifyBudgets } from "../../services/NotificationService";
import {
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
  c,
  t,
}) {
  let icon = "bulb-outline";
  let accentColor = c.primary;
  let title = "";
  let body = null;

  if (goal === "savings") {
    const rate =
      totalIncome > 0
        ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)
        : 0;
    const barPct = Math.min(Math.max(rate, 0), 100);
    const isGood = rate >= 20;
    icon = "wallet-outline";
    accentColor = isGood ? c.success : "#F59E0B";
    title = t("dashboard.goalInsight.savings.title");
    body = (
      <View>
        <Text style={{ color: c.textMuted, fontSize: 13, marginBottom: 8 }}>
          {t("dashboard.goalInsight.savings.desc", { rate: Math.max(rate, 0) })}
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

export default function Dashboard() {
  const { isDark, theme } = useTheme();
  const c = theme.colors;
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const { profile } = useOnboarding();
  const { getBudgetSummary, totalBudgeted } = useBudget();
  const {
    accounts,
    transactions,
    loading,
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

  return (
    <View className="flex-1 bg-background">
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
          <Pressable
            className="flex-row items-center bg-surface border border-border rounded-2xl px-3 py-2 active:opacity-70"
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

            {/* ===== GOAL INSIGHT CARD ===== */}
            {profile?.goal && totalIncome > 0 && (
              <GoalInsightCard
                goal={profile.goal}
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                totalBudgeted={totalBudgeted}
                categoryBreakdown={categoryBreakdown}
                lastMonthBreakdown={lastMonthBreakdown}
                c={c}
                t={t}
              />
            )}

            {/* ===== BUDGET ALERTS ===== */}
            {budgetAlerts.length > 0 && (
              <BudgetAlerts alerts={budgetAlerts} router={router} c={c} t={t} />
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
              onPress={() => router.push("/(tabs)/analytics")}
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
