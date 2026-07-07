import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View, TouchableOpacity, Image } from "react-native";
import TransactionItem from "../../components/TransactionItem";
import { useAuth } from "../../context/AuthContext";
import { useBankData } from "../../context/BankContext";
import { useBudget } from "../../context/BudgetContext";
import { useGoals } from "../../context/GoalsContext";
import { useInsights } from "../../context/InsightsContext";
import { useOnboarding } from "../../context/OnboardingContext";
import { useTheme } from "../../context/ThemeContext";
import {
  checkAndNotifyBudgets,
  processAdvisorFollowUpReminders,
  saveToInbox } from
"../../services/NotificationService";
import {
  categorizeTransaction,
  explainTotals,
  filterByPeriod,
  getCategoryBreakdown } from
"../../utils/categoryUtils";

import MonthlyCheckIn from "../../components/home/MonthlyCheckIn";
import GoalInsightCard from "../../components/home/GoalInsightCard";

const AB_COPY_KEY = "novence.home.copyVariant";
const REENTRY_STATE_KEY = "novence.home.reentryState";
const RETENTION_PING_KEY = "novence.home.retentionPing";
const WEEKLY_DIGEST_KEY = "novence.home.weeklyDigest";

function getDigestVariant(seed = "") {
  const text = String(seed || "default");
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2 === 0 ? "A" : "B";
}

function getInactivityBucket(daysInactive) {
  if (daysInactive >= 14) return 14;
  if (daysInactive >= 7) return 7;
  if (daysInactive >= 3) return 3;
  return 0;
}

function getTransactionIdentity(tx) {
  return (
    tx?.canonicalId ||
    `${tx?.connectionId || tx?.accountId || "local"}:${tx?.transactionId || tx?.manualId || tx?.bookingDate || ""}:${tx?.transactionAmount?.amount || tx?.amount || ""}`
  );
}

function isInternalTransfer(tx) {
  if (tx?.sourceLabel === "demo-transfer") return true;
  if (tx?.category === "transfer" || tx?.inferredCategory === "transfer") return true;
  return categorizeTransaction(tx).key === "transfer";
}

function getDashboardCashflowTransactions(transactions) {
  const seen = new Set();
  return (transactions || []).filter((tx) => {
    if (!tx || tx.isDuplicate || isInternalTransfer(tx)) return false;
    const identity = getTransactionIdentity(tx);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}




function getWeekKey(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1);
  const diffDays = Math.floor((date - start) / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  return `${date.getFullYear()}-W${week}`;
}

function summarizeAmount(transactions) {
  return transactions.reduce(
    (acc, tx) => {
      const amount = Number(tx?.transactionAmount?.amount || tx?.amount || 0);
      if (amount < 0) acc.expenses += Math.abs(amount);
      if (amount > 0) acc.income += amount;
      return acc;
    },
    { income: 0, expenses: 0 }
  );
}

function buildWeeklyDigest(transactions) {
  const now = new Date();
  const nowTs = now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekStartTs = nowTs - 7 * dayMs;
  const prevWeekStartTs = nowTs - 14 * dayMs;

  const inLast14Days = (transactions || []).filter((tx) => {
    const rawDate = tx?.bookingDate || tx?.valueDate;
    if (!rawDate) return false;
    const ts = new Date(rawDate).getTime();
    return !Number.isNaN(ts) && ts >= prevWeekStartTs;
  });

  if (inLast14Days.length === 0) return null;

  const thisWeek = inLast14Days.filter((tx) => {
    const ts = new Date(tx.bookingDate || tx.valueDate).getTime();
    return ts >= weekStartTs;
  });

  const prevWeek = inLast14Days.filter((tx) => {
    const ts = new Date(tx.bookingDate || tx.valueDate).getTime();
    return ts >= prevWeekStartTs && ts < weekStartTs;
  });

  const thisWeekTotals = summarizeAmount(thisWeek);
  const prevWeekTotals = summarizeAmount(prevWeek);
  const categoryBreakdown = getCategoryBreakdown(thisWeek);
  const topCategory = categoryBreakdown[0] || null;

  let spendDeltaPct = null;
  if (prevWeekTotals.expenses > 0) {
    spendDeltaPct = Math.round(
      (thisWeekTotals.expenses - prevWeekTotals.expenses) / prevWeekTotals.expenses *
      100
    );
  }

  return {
    weekKey: getWeekKey(now),
    thisWeekIncome: thisWeekTotals.income,
    thisWeekExpenses: thisWeekTotals.expenses,
    previousWeekExpenses: prevWeekTotals.expenses,
    spendDeltaPct,
    topCategory
  };
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
    refreshInsights,
    trackKpiEvent
  } = useInsights();
  const {
    getBudgetSummary,
    totalBudgeted,
    limits,
    getSuggestedBudgets,
    applySuggestedBudgets
  } = useBudget();
  const {
    accounts,
    transactions,
    sessionExpired,
    connections,
    trustByConnection,
    getTotalBalance,
    getRecentTransactions
  } = useBankData();

  const totalBalance = getTotalBalance();
  const recentTransactions = getRecentTransactions(5);


  const cashflowTransactions = getDashboardCashflowTransactions(transactions);
  const monthlyTx = filterByPeriod(cashflowTransactions, 0);
  const monthlyExplainability = explainTotals(monthlyTx);
  const totalIncome = monthlyExplainability.income;
  const totalExpenses = monthlyExplainability.expenses;
  const monthlyNet = monthlyExplainability.net;


  const categoryBreakdown = getCategoryBreakdown(monthlyTx).slice(0, 3);


  const lastMonthTx = filterByPeriod(transactions, 1);
  const lastMonthBreakdown = getCategoryBreakdown(lastMonthTx);


  const budgetAlerts = getBudgetSummary().filter(
    (b) => b.status === "warning" || b.status === "over"
  );


  useEffect(() => {
    const summary = getBudgetSummary();
    if (summary.length > 0) {
      checkAndNotifyBudgets(summary, t).catch(() => {});
    }
  }, [transactions, getBudgetSummary, t]);

  const hasData = accounts.length > 0 || transactions.length > 0;
  const activeTrustEntries = connections.
  filter((conn) => conn.status === "active").
  map((conn) => trustByConnection[conn.id]).
  filter(Boolean);

  const hasOutdatedData = activeTrustEntries.some((entry) => entry.dataMayBeOutdated);
  const hasDegradedHealth = activeTrustEntries.some((entry) => entry.healthState === "degraded");


  const firstName = user?.name?.split(" ")[0] || t("profile.defaultUser");


  const initials = user?.name ?
  user.name.
  split(" ").
  map((w) => w[0]).
  join("").
  toUpperCase().
  slice(0, 2) :
  "U";

  const quickActions = [
  {
    key: "accounts",
    icon: "pie-chart-outline",
    label: t("dashboard.spendingInsights"),
    onPress: () => router.push("/(tabs)/analytics")
  },
  {
    key: "budget",
    icon: "wallet-outline",
    label: t("dashboard.nudge.noBudget.action"),
    onPress: () => router.push("/(tabs)/budget")
  },
  {
    key: "transactions",
    icon: "receipt-outline",
    label: t("dashboard.seeAll"),
    onPress: () => router.push("/transactions")
  }];



  const [copyVariant, setCopyVariant] = useState("A");
  const [, setReentryState] = useState({ bucket: 0, daysInactive: 0 });



  useEffect(() => {
    refreshInsights();
  }, [transactions, refreshInsights]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(AB_COPY_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed?.variant) {
          setCopyVariant(parsed.variant);
          return;
        }

        const seed = user?.id || user?.email || firstName;
        const variant = getDigestVariant(seed);
        setCopyVariant(variant);
        await AsyncStorage.setItem(
          AB_COPY_KEY,
          JSON.stringify({
            variant,
            assignedAt: Date.now()
          })
        );
      } catch {
        setCopyVariant("A");
      }
    })();
  }, [firstName, user?.email, user?.id]);

  useEffect(() => {
    (async () => {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      try {
        const raw = await AsyncStorage.getItem(REENTRY_STATE_KEY);
        const state = raw ? JSON.parse(raw) : {};
        const lastVisitAt = Number(state.lastVisitAt || 0);
        const daysInactive = lastVisitAt > 0 ? Math.floor((now - lastVisitAt) / dayMs) : 0;
        const bucket = getInactivityBucket(daysInactive);

        setReentryState({ bucket, daysInactive });

        if (bucket > 0 && state.lastTrackedBucketDay !== `${bucket}:${new Date().toISOString().slice(0, 10)}`) {
          trackKpiEvent("reentry_banner_view", {
            metadata: {
              bucket,
              daysInactive
            }
          });
        }

        await AsyncStorage.setItem(
          REENTRY_STATE_KEY,
          JSON.stringify({
            lastVisitAt: now,
            lastTrackedBucketDay:
            bucket > 0 ? `${bucket}:${new Date().toISOString().slice(0, 10)}` : state.lastTrackedBucketDay
          })
        );
      } catch {
        setReentryState({ bucket: 0, daysInactive: 0 });
      }
    })();
  }, [trackKpiEvent]);

  useEffect(() => {
    processAdvisorFollowUpReminders(t).
    then((count) => {
      if (count > 0) {
        trackKpiEvent("advisor_followup_reminder_sent", {
          metadata: { count }
        });
      }
    }).
    catch(() => {});
  }, [t, trackKpiEvent]);

  const weeklyDigest = buildWeeklyDigest(transactions);

  useEffect(() => {
    (async () => {
      const dayKey = new Date().toISOString().slice(0, 10);
      try {
        const raw = await AsyncStorage.getItem(RETENTION_PING_KEY);
        const state = raw ? JSON.parse(raw) : {};
        if (state.lastDayKey === dayKey) return;

        await AsyncStorage.setItem(
          RETENTION_PING_KEY,
          JSON.stringify({
            lastDayKey: dayKey
          })
        );

        trackKpiEvent("retention_home_visit", {
          metadata: {
            dayKey
          }
        });
      } catch {

      }
    })();
  }, [trackKpiEvent]);

  useEffect(() => {
    if (!weeklyDigest) return;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(WEEKLY_DIGEST_KEY);
        const state = raw ? JSON.parse(raw) : {};

        if (state.lastTrackedWeek !== weeklyDigest.weekKey) {
          trackKpiEvent("weekly_digest_view", {
            metadata: {
              weekKey: weeklyDigest.weekKey,
              copyVariant
            }
          });

          trackKpiEvent("insight_copy_variant_view", {
            metadata: {
              zone: "weekly_digest",
              weekKey: weeklyDigest.weekKey,
              copyVariant
            }
          });
        }

        if (state.lastInboxWeek !== weeklyDigest.weekKey) {
          const delta = weeklyDigest.spendDeltaPct;
          const trendText =
          delta === null ?
          t("dashboard.weeklyDigest.noBaseline") :
          delta > 0 ?
          t("dashboard.weeklyDigest.trendUp", { pct: Math.abs(delta) }) :
          t("dashboard.weeklyDigest.trendDown", { pct: Math.abs(delta) });

          await saveToInbox({
            type: "weekly_digest",
            title: t("dashboard.weeklyDigest.title"),
            body: t("dashboard.weeklyDigest.inboxBody", {
              expenses: weeklyDigest.thisWeekExpenses.toLocaleString("ro-RO", {
                minimumFractionDigits: 2
              }),
              trend: trendText
            })
          });
        }

        await AsyncStorage.setItem(
          WEEKLY_DIGEST_KEY,
          JSON.stringify({
            lastTrackedWeek: weeklyDigest.weekKey,
            lastInboxWeek: weeklyDigest.weekKey
          })
        );
      } catch {

      }
    })();
  }, [copyVariant, t, trackKpiEvent, weeklyDigest]);

  return (
    <View className="flex-1 bg-background">
      {}
      <MonthlyCheckIn
        transactions={transactions}
        budgetSummary={budgetAlerts}
        limits={limits}
        applySuggestedBudgets={applySuggestedBudgets}
        getSuggestedBudgets={getSuggestedBudgets}
        profile={profile}
        c={c}
        t={t}
        onViewed={() => {
          const suggestions = profile ? getSuggestedBudgets(profile) : [];
          trackKpiEvent("monthly_close_view", {
            metadata: {
              hasSuggestions: suggestions.length > 0
            }
          });
        }}
        onAccepted={() => {
          trackKpiEvent("monthly_close_apply", {
            metadata: {
              source: "monthly_close_summary"
            }
          });
        }} />
      
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}>
        
        {}
        <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {}
          <Text style={{ color: c.foreground, fontWeight: "800", fontSize: 20 }}>
            {firstName}
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/profile")}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              overflow: "hidden",
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"
            }}>

            <View style={{ flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
              {user?.avatar ?
              <Image source={{ uri: user.avatar }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> :

              <LinearGradient colors={[c.primary, c.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}>{initials}</Text>
                </LinearGradient>
              }
            </View>
          </TouchableOpacity>
        </View>

        {!hasData ? (

        <View style={{ paddingHorizontal: 24, marginTop: 40, alignItems: "center" }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <Ionicons name="wallet-outline" size={40} color={c.textMuted} />
            </View>
            <Text style={{ color: c.foreground, fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 12 }}>
              {t("dashboard.totalBalance")}
            </Text>
            <Text style={{ color: c.textMuted, fontSize: 16, textAlign: "center", marginBottom: 32, paddingHorizontal: 20 }}>
              {t("dashboard.connectFirstDesc")}
            </Text>

            <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/accounts")}>
            
              <View style={{ width: "100%", backgroundColor: c.primary, paddingHorizontal: 32, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700" }}>{t("accounts.connectNow")}</Text>
              </View>
            </TouchableOpacity>
          </View>) : (


        <View>
            {}
            <View style={{ paddingHorizontal: 24, gap: 8, marginBottom: 16 }}>
              {(hasOutdatedData || hasDegradedHealth || sessionExpired) &&
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(tabs)/accounts")}
              style={{ backgroundColor: `${c.warning}15`, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center" }}>
              
                  <Ionicons name="warning" size={16} color={c.warning} style={{ marginRight: 8 }} />
                  <Text style={{ color: c.foreground, flex: 1, fontSize: 13, fontWeight: "600" }}>
                    {sessionExpired ? t("accounts.sessionExpired") : hasOutdatedData ? t("accounts.dataMayBeOutdated") : t("accounts.healthDegraded")}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={c.warning} />
                </TouchableOpacity>
            }


            </View>

            {}
            <View style={{ paddingHorizontal: 24, alignItems: "center", marginBottom: 32 }}>
              <Text style={{ color: c.textMuted, fontSize: 14, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                {t("dashboard.totalBalance")}
              </Text>
              <Text style={{ color: c.foreground, fontSize: 52, fontWeight: "900", letterSpacing: -2 }}>
                {totalBalance.toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
                <Text style={{ color: c.textMuted, fontSize: 24, fontWeight: "600" }}> lei</Text>
              </Text>
            </View>

            {}
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 32, paddingHorizontal: 24, marginBottom: 40 }}>
              {quickActions.map((action, i) =>
            <TouchableOpacity
              key={action.key}
              activeOpacity={0.7}
              onPress={action.onPress}>
              
                  <View style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                alignItems: "center",
                justifyContent: "center"
              }}>
                    <Ionicons name={action.icon} size={28} color={i === 0 ? c.primary : c.foreground} />
                  </View>
                </TouchableOpacity>
            )}
            </View>

            {}
            <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
              <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: 20, padding: 16 }}>
                <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  {t("dashboard.monthlyCashflow")}
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: "600", marginBottom: 4 }}>{t("dashboard.income")}</Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: c.success, fontSize: 14, fontWeight: "800" }}>+{totalIncome.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} lei</Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", marginHorizontal: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: "600", marginBottom: 4 }}>{t("dashboard.expenses")}</Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: c.expense, fontSize: 14, fontWeight: "800" }}>-{totalExpenses.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} lei</Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", marginHorizontal: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: "600", marginBottom: 4 }}>{t("dashboard.monthlyNet")}</Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: monthlyNet >= 0 ? c.success : c.expense, fontSize: 14, fontWeight: "800" }}>
                      {monthlyNet >= 0 ? "+" : "-"}{Math.abs(monthlyNet).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} lei
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {}
            {profile?.goal && (
          totalIncome > 0 ||
          profile.goal === "savings" && goals.length > 0) &&
          <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
                  <GoalInsightCard
              goal={profile.goal}
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              totalBudgeted={totalBudgeted}
              categoryBreakdown={categoryBreakdown}
              lastMonthBreakdown={lastMonthBreakdown}
              savingsGoals={goals}
              c={c}
              t={t} />
            
                </View>
          }

            {}
            <View style={{ paddingHorizontal: 24 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ color: c.foreground, fontSize: 20, fontWeight: "800" }}>
                  {t("dashboard.recentTransactions")}
                </Text>
                <TouchableOpacity onPress={() => router.push("/transactions")}>
                  <Text style={{ color: c.primary, fontSize: 14, fontWeight: "700" }}>{t("dashboard.seeAll")}</Text>
                </TouchableOpacity>
              </View>

              {recentTransactions.length === 0 ?
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <Text style={{ color: c.textMuted, fontSize: 14 }}>{t("dashboard.noTransactions")}</Text>
                </View> :

            <View style={{ borderRadius: 24, overflow: "hidden" }}>
                  {recentTransactions.map((tx, index) =>
              <TransactionItem
                key={`${tx.connectionId || ""}-${tx.transactionId || index}`}
                tx={tx}
                isLast={index === recentTransactions.length - 1} />

              )}
                </View>
            }
            </View>
          </View>)
        }
      </ScrollView>
    </View>);

}
