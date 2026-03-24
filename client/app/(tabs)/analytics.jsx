import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View } from
"react-native";
import { BarChart, PieChart, LineChart } from "react-native-gifted-charts";
import ChartSkeleton from "../../components/analytics/ChartSkeleton";
import CategoryBreakdownWithPie from "../../components/analytics/CategoryBreakdownWithPie";
import BudgetVsActualCard from "../../components/analytics/BudgetVsActualCard";
import HealthScoreRing from "../../components/analytics/HealthScoreRing";
import SmartSummary from "../../components/analytics/SmartSummary";
import AnomalyPills from "../../components/analytics/AnomalyPills";
import TrendComboChart from "../../components/analytics/TrendComboChart";
import SafeToSpendHero from "../../components/analytics/SafeToSpendHero";
import TimeTabs from "../../components/analytics/TimeTabs";
import BottomSheet from "../../components/BottomSheet";
import SectionHeader from "../../components/SectionHeader";
import TransactionItem from "../../components/TransactionItem";
import { useBankData } from "../../context/BankContext";
import { useBudget } from "../../context/BudgetContext";
import { useTheme } from "../../context/ThemeContext";
import {
  CATEGORIES,
  categorizeTransaction,
  detectAnomalies,
  detectRecurringTransactions,
  explainTotals,
  filterByPeriod,
  getCashFlowForecast,
  getCategoryBreakdown,
  getDailyExpenses,
  getFinancialHealthScore,
  getMonthlyComparison,
  getMonthlyIncomeTrend,
  calculateSafeToSpend,
  getAdvancedRegressionForecast } from
"../../utils/categoryUtils";
import { exportFinancialReport } from "../../utils/exportPdf";
import api from "../../services/api";

const SCREEN_WIDTH = Dimensions.get("window").width;



export default function Analytics() {
  const { isDark, theme } = useTheme();
  const c = theme.colors;
  const { t, i18n } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [activeView, setActiveView] = useState(null);
  const [timeMode, setTimeMode] = useState("present");
  const [monthlySummaryTrend, setMonthlySummaryTrend] = useState([]);
  const { transactions, loading, getTotalBalance } = useBankData();
  const { getBudgetSummary, limits, currentMonthSpending } = useBudget();

  useEffect(() => {
    let mounted = true;

    async function loadMonthlySummary() {
      try {
        const res = await api.get("/analytics/monthly-summary", {
          params: { months: 6 }
        });

        if (!mounted) return;

        const locale = i18n.language?.startsWith("ro") ? "ro-RO" : "en-US";
        const mapped = (res.data?.monthly || []).map((row) => {
          const monthDate = new Date(row.monthStart);
          const label = Number.isNaN(monthDate.getTime()) ?
          String(row.monthStart || "") :
          monthDate.toLocaleDateString(locale, {
            month: "short"
          });

          return {
            label,
            income: Number(row.income || 0),
            expenses: Number(row.expenses || 0),
            net: Number(row.net || 0),
            monthStart: row.monthStart
          };
        });

        setMonthlySummaryTrend(mapped);
      } catch {
        if (mounted) setMonthlySummaryTrend([]);
      }
    }

    loadMonthlySummary();

    return () => {
      mounted = false;
    };
  }, [i18n.language]);

  const PERIODS = [
  t("analytics.thisMonth"),
  t("analytics.lastMonth"),
  t("analytics.threeMonths")];


  const filteredTx = useMemo(
    () => filterByPeriod(transactions, selectedPeriod),
    [transactions, selectedPeriod]
  );

  const explainability = useMemo(() => explainTotals(filteredTx), [filteredTx]);
  const totalIncome = explainability.income;
  const totalExpenses = explainability.expenses;

  const latestSourceUpdate = useMemo(() => {
    if (filteredTx.length === 0) return null;
    const latestMillis = filteredTx.
    map((tx) => new Date(tx.lastUpdatedAt || tx.bookingDate || tx.valueDate).getTime()).
    filter((value) => Number.isFinite(value)).
    sort((a, b) => b - a)[0];

    return latestMillis ? new Date(latestMillis) : null;
  }, [filteredTx]);

  const categoryData = useMemo(
    () => getCategoryBreakdown(filteredTx),
    [filteredTx]
  );

  const dailyData = useMemo(() => getDailyExpenses(filteredTx), [filteredTx]);

  const spendingInsights = useMemo(() => {
    const expenseTx = filteredTx.filter(
      (tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0
    );
    if (expenseTx.length === 0) return null;

    const dates = [...new Set(expenseTx.map((tx) => tx.bookingDate))];
    const daysWithExpenses = dates.length || 1;
    const avgDaily = totalExpenses / daysWithExpenses;

    const merchantFreq = {};
    expenseTx.forEach((tx) => {
      const name =
      tx.creditorName || tx.remittanceInformationUnstructured || "Unknown";
      merchantFreq[name] = (merchantFreq[name] || 0) + 1;
    });
    const topMerchant = Object.entries(merchantFreq).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const lastMonthTx = filterByPeriod(transactions, 1);
    const lastMonthExpenses = lastMonthTx.
    filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0).
    reduce(
      (sum, tx) =>
      sum + Math.abs(parseFloat(tx.transactionAmount?.amount || 0)),
      0
    );
    const percentChange =
    lastMonthExpenses > 0 ?
    (totalExpenses - lastMonthExpenses) / lastMonthExpenses * 100 :
    0;

    return {
      avgDaily,
      topMerchant: topMerchant ? topMerchant[0] : null,
      topMerchantCount: topMerchant ? topMerchant[1] : 0,
      percentChange,
      lastMonthExpenses
    };
  }, [filteredTx, totalExpenses, transactions]);

  const recurringTransactions = useMemo(
    () => detectRecurringTransactions(transactions),
    [transactions]
  );

  const totalMonthlyRecurring = useMemo(
    () => recurringTransactions.reduce((sum, r) => sum + r.monthlyEstimate, 0),
    [recurringTransactions]
  );

  const monthlyComparison = useMemo(
    () => getMonthlyComparison(transactions),
    [transactions]
  );

  const totalBalance = getTotalBalance();

  const advancedForecast = useMemo(
    () => getAdvancedRegressionForecast(transactions, totalBalance),
    [transactions, totalBalance]
  );

  const cashFlowForecast = useMemo(
    () => getCashFlowForecast(transactions, totalBalance),
    [transactions, totalBalance]
  );

  const categoryTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return filteredTx.
    filter((tx) => {
      const cat = categorizeTransaction(tx);
      return cat.key === selectedCategory.key;
    }).
    sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));
  }, [filteredTx, selectedCategory]);

  const pieData = useMemo(() => {
    if (categoryData.length === 0) return [];
    return categoryData.map((cat) => ({
      value: cat.total,
      color: cat.color,
      text: `${cat.percentage}%`,
      textColor: "#fff",
      textSize: 10
    }));
  }, [categoryData]);

  const barData = useMemo(
    () =>
    dailyData.map((d) => ({
      value: d.value,
      label: d.label,
      frontColor: "#10B981",
      gradientColor: "#059669",
      topLabelComponent: () =>
      <Text
        style={{
          color: c.chartAxisTextColor,
          fontSize: 9,
          marginBottom: 2
        }}>
        
            {d.value > 0 ? Math.round(d.value) : ""}
          </Text>

    })),
    [dailyData, isDark]
  );

  const monthlyIncomeTrend = useMemo(
    () =>
    monthlySummaryTrend.length > 0 ?
    monthlySummaryTrend :
    getMonthlyIncomeTrend(transactions, 6),
    [monthlySummaryTrend, transactions]
  );

  const incomeTrendBarData = useMemo(
    () =>
    monthlyIncomeTrend.map((d) => ({
      value: d.income,
      label: d.label,
      frontColor: "#22C55E",
      gradientColor: "#16A34A",
      topLabelComponent: () =>
      <Text
        style={{
          color: c.chartAxisTextColor,
          fontSize: 8,
          marginBottom: 2
        }}>
        
            {d.income > 0 ? Math.round(d.income) : ""}
          </Text>

    })),
    [monthlyIncomeTrend, isDark]
  );

  const budgetVsActualData = useMemo(() => {
    return getBudgetSummary().map((b) => {
      const cat = CATEGORIES.find((c) => c.key === b.key);
      return {
        ...b,
        color: cat?.color ?? "#6B7280",
        icon: cat?.icon ?? "ellipsis-horizontal"
      };
    });
  }, [getBudgetSummary]);

  const healthScore = useMemo(
    () =>
    getFinancialHealthScore(
      transactions,
      limits,
      currentMonthSpending
    ),
    [transactions, limits, currentMonthSpending]
  );

  const safeToSpendData = useMemo(
    () => calculateSafeToSpend(transactions, recurringTransactions, 0),
    [transactions, recurringTransactions]
  );

  const anomalies = useMemo(
    () => detectAnomalies(transactions, limits, currentMonthSpending),
    [transactions, limits, currentMonthSpending]
  );

  const hasData = filteredTx.length > 0;
  const shouldShowChartSkeleton = loading && hasData;

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const labels = {
        reportTitle: t("export.reportTitle"),
        period: t("export.period"),
        generatedAt: t("export.generatedAt"),
        income: t("analytics.income"),
        expenses: t("analytics.expenses"),
        net: t("export.net"),
        avgDaily: t("analytics.avgDaily"),
        topMerchant: t("analytics.topMerchant"),
        savingsRate: t("export.savingsRate"),
        byCategory: t("analytics.byCategory"),
        category: t("export.category"),
        amount: t("export.amount"),
        share: t("export.share"),
        budgetTitle: t("budget.title"),
        spent: t("export.spent"),
        limit: t("export.limit"),
        remaining: t("export.remaining"),
        progress: t("export.progress"),
        transactionsTitle: t("analytics.recentTransactions"),
        date: t("export.date"),
        merchant: t("export.merchant"),
        categories: {
          food: t("analytics.categories.food"),
          transport: t("analytics.categories.transport"),
          shopping: t("analytics.categories.shopping"),
          utilities: t("analytics.categories.utilities"),
          housing: t("analytics.categories.housing"),
          entertainment: t("analytics.categories.entertainment"),
          health: t("analytics.categories.health"),
          transfer: t("analytics.categories.transfer"),
          salary: t("analytics.categories.salary"),
          other: t("analytics.categories.other")
        }
      };
      await exportFinancialReport({
        filteredTx,
        categoryData,
        totalIncome,
        totalExpenses,
        spendingInsights,
        budgetSummary: getBudgetSummary(),
        periodLabel: PERIODS[selectedPeriod],
        labels
      });
    } catch {
      Alert.alert("Export", t("export.exportError"));
    } finally {
      setExporting(false);
    }
  };

  const openSubView = (key) => setActiveView(key);

  const goBack = () => setActiveView(null);

  const VIEW_LABELS = {
    categorii: t("analytics.fab.categorii"),
    recurente: t("analytics.fab.recurente"),
    tranzactii: t("analytics.fab.tranzactii"),
    comparatie: t("analytics.fab.comparatie"),
    cashflow: t("analytics.fab.cashflow"),
    venituri: t("analytics.fab.venituri"),
    cheltuieli: t("analytics.fab.cheltuieli"),
    buget: t("analytics.fab.buget"),
    trend: t("analytics.trend.title")
  };

  const handleAnomalyTap = (anomaly) => {
    if (anomaly.categoryKey) {
      const cat = categoryData.find((c) => c.key === anomaly.categoryKey);
      if (cat) setSelectedCategory(cat);else
      openSubView("categorii");
    } else if (anomaly.type === "good_news") {
      openSubView("cashflow");
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}>
        
        {}
        {}
        <View style={{ flexDirection: "row", marginHorizontal: 24, marginTop: 56, gap: 12, alignItems: "center" }}>
          {activeView ?
          <>
              <Pressable
              onPress={goBack}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
                alignItems: "center",
                justifyContent: "center"
              }}>
              
                <Ionicons name="arrow-back" size={18} color={c.primary} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 15 }}>
                  {VIEW_LABELS[activeView]}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {PERIODS[selectedPeriod]}
                </Text>
              </View>
            </> :
          null}
          
        </View>

        {}
        {!activeView &&
        <TimeTabs
          activeTab={timeMode}
          onTabChange={setTimeMode}
          isDark={isDark}
          theme={theme} />

        }

        {loading &&
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 16,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: isDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.06)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(16,185,129,0.20)" : "rgba(16,185,129,0.15)",
            flexDirection: "row",
            alignItems: "center",
            gap: 10
          }}>
          
            <ActivityIndicator size="small" color={c.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.foreground, fontSize: 13, fontWeight: "600" }}>
                {t("analytics.syncingData")}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>
                {t("analytics.syncingHint")}
              </Text>
            </View>
          </View>
        }



        {

        }
        {timeMode === "present" && !activeView &&
        <>
            {}
            <SafeToSpendHero data={safeToSpendData} c={c} isDark={isDark} t={t} />

            {}
            <View
            style={{
              flexDirection: "row",
              marginHorizontal: 24,
              marginTop: 20,
              gap: 12
            }}>
            
              <Pressable
              onPress={() => openSubView("venituri")}
              style={{
                flex: 1,
                borderRadius: 20,
                padding: 16,
                backgroundColor: isDark ?
                "rgba(34,197,94,0.08)" :
                "rgba(34,197,94,0.06)",
                borderWidth: 1,
                borderColor: isDark ?
                "rgba(34,197,94,0.20)" :
                "rgba(34,197,94,0.15)"
              }}>
              
                <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12
                }}>
                
                  <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: "rgba(34,197,94,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 6
                  }}>
                  
                    <Ionicons name="trending-up" size={14} color="#22C55E" />
                  </View>
                  <Text style={{ color: c.textMuted, fontSize: 11, flex: 1 }}>
                    {t("analytics.income")}
                  </Text>
                </View>
                <Text
                style={{ color: "#22C55E", fontWeight: "700", fontSize: 17 }}>
                
                  +{totalIncome.toLocaleString("ro-RO", {
                  maximumFractionDigits: 0
                })}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>
                  RON
                </Text>
              </Pressable>

              <Pressable
              onPress={() => openSubView("cheltuieli")}
              style={{
                flex: 1,
                borderRadius: 20,
                padding: 16,
                backgroundColor: isDark ?
                "rgba(244,63,94,0.08)" :
                "rgba(244,63,94,0.06)",
                borderWidth: 1,
                borderColor: isDark ?
                "rgba(244,63,94,0.20)" :
                "rgba(244,63,94,0.15)"
              }}>
              
                <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12
                }}>
                
                  <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: "rgba(244,63,94,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 6
                  }}>
                  
                    <Ionicons name="trending-down" size={14} color="#F43F5E" />
                  </View>
                  <Text style={{ color: c.textMuted, fontSize: 11, flex: 1 }}>
                    {t("analytics.expenses")}
                  </Text>
                </View>
                <Text
                style={{ color: "#F43F5E", fontWeight: "700", fontSize: 17 }}>
                
                  -{totalExpenses.toLocaleString("ro-RO", {
                  maximumFractionDigits: 0
                })}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>
                  RON
                </Text>
              </Pressable>
            </View>

            {}
            {hasData &&
          <View style={{ marginHorizontal: 24, marginTop: 16 }}>
                <SmartSummary
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              spendingInsights={spendingInsights}
              cashFlowForecast={cashFlowForecast}
              categoryData={categoryData}
              c={c}
              isDark={isDark}
              t={t} />
            
              </View>
          }

            {}
            {hasData && anomalies.length > 0 &&
          <View style={{ marginHorizontal: 24, marginTop: 16 }}>
                <AnomalyPills
              anomalies={anomalies}
              onTapAnomaly={handleAnomalyTap}
              c={c}
              isDark={isDark}
              t={t} />
            
              </View>
          }
          </>
        }

        {

        }
        {timeMode === "past" && !activeView &&
        <>
            {}
            {hasData &&
          <View style={{ marginHorizontal: 24, marginTop: 20 }}>
                <HealthScoreRing
              healthScore={healthScore}
              onDrillDown={() => openSubView("categorii")}
              c={c}
              isDark={isDark}
              t={t} />
            
              </View>
          }

            {}
            <View style={{ marginHorizontal: 24, marginTop: 20 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {}
                <Pressable
                style={{ width: (SCREEN_WIDTH - 60) / 2 }}
                onPress={() => openSubView("categorii")}>
                
                  <View
                  style={{
                    borderRadius: 20,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: isDark ?
                    "rgba(139,92,246,0.20)" :
                    "rgba(139,92,246,0.15)",
                    backgroundColor: isDark ?
                    "rgba(139,92,246,0.08)" :
                    "rgba(139,92,246,0.05)"
                  }}>
                  
                    <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: "rgba(139,92,246,0.15)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12
                    }}>
                    
                      <Ionicons name="pie-chart" size={18} color="#8B5CF6" />
                    </View>
                    <Text
                    style={{
                      color: c.foreground,
                      fontWeight: "700",
                      fontSize: 13,
                      marginBottom: 2
                    }}>
                    
                      {t("analytics.fab.categorii")}
                    </Text>
                    <Text style={{ color: c.textMuted, fontSize: 11 }}>
                      {categoryData.length} {t("analytics.categories.count")}
                    </Text>
                  </View>
                </Pressable>

                {}
                <Pressable
                style={{ width: (SCREEN_WIDTH - 60) / 2 }}
                onPress={() => openSubView("recurente")}>
                
                  <View
                  style={{
                    borderRadius: 20,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: isDark ?
                    "rgba(245,158,11,0.20)" :
                    "rgba(245,158,11,0.15)",
                    backgroundColor: isDark ?
                    "rgba(245,158,11,0.08)" :
                    "rgba(245,158,11,0.05)"
                  }}>
                  
                    <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: "rgba(245,158,11,0.15)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12
                    }}>
                    
                      <Ionicons name="repeat" size={18} color="#F59E0B" />
                    </View>
                    <Text
                    style={{
                      color: c.foreground,
                      fontWeight: "700",
                      fontSize: 13,
                      marginBottom: 2
                    }}>
                    
                      {t("analytics.fab.recurente")}
                    </Text>
                    <Text
                    style={{ color: c.textMuted, fontSize: 11 }}
                    numberOfLines={1}>
                    
                      {recurringTransactions.length}{" "}
                      {t("analytics.recurring.subscriptions")}
                    </Text>
                  </View>
                </Pressable>

                {}
                <Pressable
                style={{ width: (SCREEN_WIDTH - 60) / 2 }}
                onPress={() => openSubView("trend")}>
                
                  <View
                  style={{
                    borderRadius: 20,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: isDark ?
                    "rgba(6,182,212,0.20)" :
                    "rgba(6,182,212,0.15)",
                    backgroundColor: isDark ?
                    "rgba(6,182,212,0.08)" :
                    "rgba(6,182,212,0.05)"
                  }}>
                  
                    <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: "rgba(6,182,212,0.15)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12
                    }}>
                    
                      <Ionicons name="stats-chart" size={18} color="#06B6D4" />
                    </View>
                    <Text
                    style={{
                      color: c.foreground,
                      fontWeight: "700",
                      fontSize: 13,
                      marginBottom: 2
                    }}>
                    
                      {t("analytics.trend.title")}
                    </Text>
                    <Text style={{ color: c.textMuted, fontSize: 11 }}>
                      {monthlyIncomeTrend.length} {t("analytics.recurring.mo")}
                    </Text>
                  </View>
                </Pressable>

                {}
                {budgetVsActualData.length > 0 &&
              <Pressable
                style={{ width: (SCREEN_WIDTH - 60) / 2 }}
                onPress={() => openSubView("buget")}>
                
                    <View
                  style={{
                    borderRadius: 20,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: isDark ?
                    "rgba(99,102,241,0.20)" :
                    "rgba(99,102,241,0.15)",
                    backgroundColor: isDark ?
                    "rgba(99,102,241,0.08)" :
                    "rgba(99,102,241,0.05)"
                  }}>
                  
                      <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: "rgba(99,102,241,0.15)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12
                    }}>
                    
                        <Ionicons
                      name="git-compare-outline"
                      size={18}
                      color="#6366F1" />
                    
                      </View>
                      <Text
                    style={{
                      color: c.foreground,
                      fontWeight: "700",
                      fontSize: 13,
                      marginBottom: 2
                    }}>
                    
                        {t("analytics.fab.buget")}
                      </Text>
                      <Text style={{ color: c.textMuted, fontSize: 11 }}>
                        {budgetVsActualData.length}{" "}
                        {t("analytics.categories.count")}
                      </Text>
                    </View>
                  </Pressable>
              }
              </View>

              {}
              <Pressable
              onPress={handleExport}
              disabled={exporting || !hasData}
              style={{ marginTop: 16, opacity: exporting || !hasData ? 0.6 : 1 }}>
              
                <LinearGradient
                colors={isDark ? ["rgba(59,130,246,0.15)", "rgba(59,130,246,0.05)"] : ["#EFF6FF", "#DBEAFE"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 20,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.1)"
                }}>
                
                  <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: "#3B82F6",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 16
                  }}>
                  
                    {exporting ?
                  <ActivityIndicator size="small" color="#fff" /> :

                  <Ionicons name="document-text" size={20} color="#fff" />
                  }
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 14 }}>
                      {t("analytics.past.exportReport")}
                    </Text>
                    <Text style={{ color: c.textMuted, fontSize: 11 }}>
                      PDF • {PERIODS[selectedPeriod]}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                </LinearGradient>
              </Pressable>
            </View>
          </>
        }

        {

        }
        {timeMode === "future" && !activeView &&
        <>
            {}
            <View style={{ marginHorizontal: 24, marginTop: 20 }}>
              <SectionHeader title={t("analytics.future.forecast")} />
              <View
              style={{
                backgroundColor: isDark ?
                "rgba(255,255,255,0.03)" :
                "rgba(0,0,0,0.02)",
                borderRadius: 24,
                padding: 20,
                borderWidth: 1,
                borderColor: isDark ?
                "rgba(255,255,255,0.08)" :
                "rgba(0,0,0,0.06)"
              }}>
              
                <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 24
                }}>
                
                  <View>
                    <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: "600", marginBottom: 4 }}>
                      {t("analytics.future.endOfMonth")}
                    </Text>
                    <Text
                    style={{
                      color: c.foreground,
                      fontSize: 24,
                      fontWeight: "800"
                    }}>
                    
                      {advancedForecast.projectedEndBalance.toLocaleString("ro-RO")}{" "}
                      <Text style={{ fontSize: 14, fontWeight: "600", color: c.textMuted }}>RON</Text>
                    </Text>
                  </View>
                  <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                    backgroundColor: advancedForecast.netChange >= 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                    height: 28,
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                  
                    <Text style={{ color: advancedForecast.netChange >= 0 ? "#10B981" : "#EF4444", fontSize: 12, fontWeight: "700" }}>
                      {advancedForecast.netChange >= 0 ? "+" : ""}{Math.round(advancedForecast.netChange).toLocaleString("ro-RO")}
                    </Text>
                  </View>
                </View>

                {}
                <View style={{ height: 140, overflow: "hidden", marginTop: 8 }}>
                  <LineChart
                  data={advancedForecast.dailyPoints || []}
                  width={SCREEN_WIDTH - 96}
                  height={110}
                  thickness={2.5}
                  color1={advancedForecast.netChange >= 0 ? "#10B981" : "#F43F5E"}
                  startFillColor1={advancedForecast.netChange >= 0 ? "#10B981" : "#F43F5E"}
                  endFillColor1="transparent"
                  startOpacity={0.12}
                  endOpacity={0}
                  initialSpacing={8}
                  spacing={(SCREEN_WIDTH - 120) / 30}
                  noOfSections={3}
                  yAxisColor="transparent"
                  xAxisColor="transparent"
                  yAxisTextStyle={{ color: c.textMuted, fontSize: 8 }}
                  xAxisLabelTextStyle={{ color: c.textMuted, fontSize: 8 }}
                  hideDataPoints
                  curved
                  hideRules
                  hideYAxisText />
                
                </View>

                {}
                <LinearGradient
                colors={isDark ? ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"] : ["#F8FAFC", "#F1F5F9"]}
                style={{ borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}>
                
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="sparkles" size={12} color="#fff" />
                    </View>
                    <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 13 }}>
                      {t("analytics.future.aiInsightTitle")}
                    </Text>
                  </View>
                  <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 18 }}>
                    {t(`analytics.future.insights.${advancedForecast.insightKey}`)}
                  </Text>
                  <View style={{ flexDirection: "row", marginTop: 12, gap: 16 }}>
                    <View>
                      <Text style={{ color: c.textMuted, fontSize: 10 }}>{t("analytics.future.trendSlope")}</Text>
                      <Text style={{ color: advancedForecast.slope >= 0 ? "#10B981" : "#EF4444", fontWeight: "700", fontSize: 13 }}>
                        {advancedForecast.slope >= 0 ? "+" : ""}{advancedForecast.slope.toFixed(2)} RON/zi
                      </Text>
                    </View>
                    <View>
                      <Text style={{ color: c.textMuted, fontSize: 10 }}>{t("analytics.future.volatility")}</Text>
                      <Text style={{ color: advancedForecast.volatility === "stable" ? "#10B981" : "#F59E0B", fontWeight: "700", fontSize: 13 }}>
                        {advancedForecast.volatility === "stable" ? t("analytics.future.volatilityLow") : t("analytics.future.volatilityHigh")}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>

            {}
            <View style={{ marginHorizontal: 24, marginTop: 24 }}>
              <SectionHeader title={t("analytics.future.upcomingBills")} />
              {(recurringTransactions || []).
            filter((r) => {
              const d = new Date(r.nextDate);
              return d >= new Date();
            }).
            slice(0, 5).
            map((bill, idx) =>
            <View
              key={idx}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: idx < 4 ? 1 : 0,
                borderBottomColor: isDark ?
                "rgba(255,255,255,0.06)" :
                "rgba(0,0,0,0.05)"
              }}>
              
                    <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: isDark ?
                  "rgba(255,255,255,0.06)" :
                  "rgba(0,0,0,0.04)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12
                }}>
                
                      <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={c.textMuted} />
                
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                  style={{
                    color: c.foreground,
                    fontSize: 14,
                    fontWeight: "600"
                  }}>
                  
                        {bill.name}
                      </Text>
                      <Text style={{ color: c.textMuted, fontSize: 11 }}>
                        {new Date(bill.nextDate).toLocaleDateString(
                    "ro-RO",
                    { day: "numeric", month: "short" }
                  )}
                      </Text>
                    </View>
                    <Text
                style={{
                  color: c.foreground,
                  fontSize: 14,
                  fontWeight: "700"
                }}>
                
                      {bill.monthlyEstimate.toLocaleString("ro-RO", {
                  maximumFractionDigits: 0
                })}{" "}
                      RON
                    </Text>
                  </View>
            )}
            </View>
          </>
        }

        {}
        {activeView === "trend" && hasData &&
        <View style={{ marginHorizontal: 24, marginTop: 20 }}>
            <TrendComboChart
            monthlyIncomeTrend={monthlyIncomeTrend}
            screenWidth={SCREEN_WIDTH}
            c={c}
            isDark={isDark}
            t={t} />
          
          </View>
        }

        {}
        {activeView === "categorii" && hasData &&
        <View className="mx-6 mt-5">
            {categoryData.length > 0 ?
          <View className="bg-surface rounded-2xl p-5 border border-border">
                <View className="items-center mb-5">
                  {shouldShowChartSkeleton ?
              <ChartSkeleton
                borderColor={c.border}
                tint={c.card}
                height={200} /> :


              <PieChart
                data={pieData}
                donut
                radius={90}
                innerRadius={55}
                innerCircleColor={c.chartInnerCircle}
                centerLabelComponent={() =>
                <View className="items-center">
                          <Text className="text-foreground text-lg font-bold">
                            {totalExpenses.toLocaleString("ro-RO", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                          </Text>
                          <Text className="text-text-muted text-xs">
                            {t("common.currency")}
                          </Text>
                        </View>
                } />

              }
                </View>
                {categoryData.map((cat) =>
            <Pressable
              key={cat.key}
              className="flex-row items-center py-2.5 border-t border-border active:opacity-60"
              onPress={() => setSelectedCategory(cat)}>
              
                    <View
                className="w-8 h-8 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${cat.color}18` }}>
                
                      <Ionicons name={cat.icon} size={15} color={cat.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-foreground text-sm font-medium">
                        {t(`analytics.categories.${cat.key}`)}
                      </Text>
                      <Text className="text-text-muted text-xs mt-0.5">
                        {cat.count} {t("analytics.transactions")}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <View className="items-end mr-2">
                        <Text className="text-foreground font-semibold text-sm">
                          {cat.total.toLocaleString("ro-RO", {
                      minimumFractionDigits: 2
                    })}
                        </Text>
                        <Text className="text-text-muted text-xs mt-0.5">
                          {cat.percentage}%
                        </Text>
                      </View>
                      <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={c.textMuted} />
                
                    </View>
                  </Pressable>
            )}
              </View> :

          <View className="bg-surface rounded-2xl p-8 border border-border items-center">
                <Text className="text-text-muted text-sm">
                  {t("analytics.noData")}
                </Text>
              </View>
          }
          </View>
        }

        {}
        {activeView === "recurente" &&
        <View className="mx-6 mt-5">
            {recurringTransactions.length > 0 ?
          <>
                <View className="bg-surface rounded-2xl p-4 border border-border mb-4 flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-[#F59E0B]/15 items-center justify-center mr-3">
                    <Ionicons name="repeat" size={20} color="#F59E0B" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-muted text-xs">
                      {t("analytics.recurring.totalMonthly")}
                    </Text>
                    <Text className="text-foreground font-bold text-base mt-0.5">
                      {totalMonthlyRecurring.toLocaleString("ro-RO", {
                    minimumFractionDigits: 2
                  })}{" "}
                      <Text className="text-text-muted font-normal text-xs">
                        RON
                      </Text>
                    </Text>
                  </View>
                  <View className="bg-[#F59E0B]/10 px-3 py-1 rounded-full">
                    <Text className="text-[#F59E0B] text-xs font-semibold">
                      {recurringTransactions.length}{" "}
                      {t("analytics.recurring.subscriptions")}
                    </Text>
                  </View>
                </View>
                <View className="bg-surface rounded-2xl border border-border overflow-hidden">
                  {recurringTransactions.map((item, idx) =>
              <View
                key={`${item.name}-${idx}`}
                className={`flex-row items-center p-4 ${
                idx < recurringTransactions.length - 1 ?
                "border-b border-border" :
                ""}`
                }>
                
                      <View
                  className="w-9 h-9 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: `${item.category.color}18` }}>
                  
                        <Ionicons
                    name={item.category.icon}
                    size={17}
                    color={item.category.color} />
                  
                      </View>
                      <View className="flex-1 mr-2">
                        <Text
                    className="text-foreground font-semibold text-sm"
                    numberOfLines={1}>
                    
                          {item.name}
                        </Text>
                        <View className="flex-row items-center mt-0.5 gap-2">
                          <View className="bg-border px-2 py-0.5 rounded-full">
                            <Text className="text-text-muted text-[10px] font-medium">
                              {t(`analytics.recurring.freq.${item.frequency}`)}
                            </Text>
                          </View>
                          <Text className="text-text-muted text-[10px]">
                            {t("analytics.recurring.next")}{" "}
                            {new Date(item.nextDate).toLocaleDateString(
                        "ro-RO",
                        { day: "numeric", month: "short" }
                      )}
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-expense font-bold text-sm">
                          -
                          {item.amount.toLocaleString("ro-RO", {
                      minimumFractionDigits: 2
                    })}
                        </Text>
                        <Text className="text-text-muted text-[10px] mt-0.5">
                          {item.occurrences}x
                        </Text>
                      </View>
                    </View>
              )}
                </View>
              </> :

          <View
            className="rounded-2xl p-5"
            style={{
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: c.border
            }}>
            
                <View className="flex-row items-center">
                  <View className="flex-1 pr-4">
                    <Text className="text-foreground font-semibold text-sm mb-1">
                      {t("analytics.recurring.emptyTitle")}
                    </Text>
                    <Text className="text-text-muted text-xs leading-4">
                      {t("analytics.recurring.emptyDesc")}
                    </Text>
                  </View>
                  <Ionicons
                name="repeat-outline"
                size={36}
                color={c.textMuted} />
              
                </View>
              </View>
          }
          </View>
        }

        {}
        {activeView === "comparatie" &&
        <View className="mx-6 mt-5">
            {monthlyComparison.length > 0 ?
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
                {}
                <View className="flex-row items-center justify-end px-4 pt-4 pb-2 gap-4">
                  <View className="flex-row items-center gap-1.5">
                    <View
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: "#06B6D4" }} />
                
                    <Text className="text-text-muted text-xs">
                      {t("analytics.comparison.current")}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <View
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: "#94A3B8" }} />
                
                    <Text className="text-text-muted text-xs">
                      {t("analytics.comparison.previous")}
                    </Text>
                  </View>
                </View>

                {monthlyComparison.map((item, idx) => {
              const maxVal = Math.max(item.current, item.previous, 1);
              const barWidth = SCREEN_WIDTH - 48 - 32 - 48;
              return (
                <View
                  key={item.key}
                  className={`px-4 py-3 ${
                  idx < monthlyComparison.length - 1 ?
                  "border-b border-border" :
                  ""}`
                  }>
                  
                      <View className="flex-row items-center mb-2">
                        <View
                      className="w-7 h-7 rounded-full items-center justify-center mr-2"
                      style={{ backgroundColor: `${item.color}18` }}>
                      
                          <Ionicons
                        name={item.icon}
                        size={13}
                        color={item.color} />
                      
                        </View>
                        <Text className="text-foreground text-xs font-semibold flex-1">
                          {t(`analytics.categories.${item.key}`)}
                        </Text>
                        {item.diffPct !== null &&
                    <View
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor:
                        item.diff <= 0 ? "#22C55E18" : "#F43F5E18"
                      }}>
                      
                            <Text
                        className="text-[10px] font-bold"
                        style={{
                          color: item.diff <= 0 ? "#22C55E" : "#F43F5E"
                        }}>
                        
                              {item.diff <= 0 ? "▼" : "▲"}
                              {Math.abs(item.diffPct)}%
                            </Text>
                          </View>
                    }
                      </View>

                      {}
                      <View className="flex-row items-center mb-1 gap-2">
                        <View
                      style={{
                        width: barWidth * (item.current / maxVal),
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#06B6D4",
                        minWidth: item.current > 0 ? 4 : 0
                      }} />
                    
                        <Text className="text-foreground text-[10px] font-semibold">
                          {item.current.toLocaleString("ro-RO", {
                        maximumFractionDigits: 0
                      })}{" "}
                          RON
                        </Text>
                      </View>

                      {}
                      <View className="flex-row items-center gap-2">
                        <View
                      style={{
                        width: barWidth * (item.previous / maxVal),
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#94A3B8",
                        minWidth: item.previous > 0 ? 4 : 0
                      }} />
                    
                        <Text className="text-text-muted text-[10px]">
                          {item.previous.toLocaleString("ro-RO", {
                        maximumFractionDigits: 0
                      })}{" "}
                          RON
                        </Text>
                      </View>
                    </View>);

            })}
              </View> :

          <View
            className="rounded-2xl p-5"
            style={{
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: c.border
            }}>
            
                <View className="flex-row items-center">
                  <View className="flex-1 pr-4">
                    <Text className="text-foreground font-semibold text-sm mb-1">
                      {t("analytics.comparison.emptyTitle")}
                    </Text>
                    <Text className="text-text-muted text-xs leading-4">
                      {t("analytics.comparison.emptyDesc")}
                    </Text>
                  </View>
                  <Ionicons
                name="bar-chart-outline"
                size={36}
                color={c.textMuted} />
              
                </View>
              </View>
          }
          </View>
        }

        {}
        {activeView === "cashflow" &&
        <View className="mx-6 mt-5">
            {}
            <View
            className="rounded-2xl p-5 mb-4"
            style={{
              backgroundColor: c.card,
              borderLeftWidth: 4,
              borderLeftColor:
              cashFlowForecast.projectedNet >= 0 ? "#10B981" : "#F43F5E"
            }}>
            
              <Text className="text-text-muted text-xs mb-1">
                {t("analytics.cashflow.projectedNet")}
              </Text>
              <Text
              className="font-bold text-2xl mb-0.5"
              style={{
                color:
                cashFlowForecast.projectedNet >= 0 ? "#10B981" : "#F43F5E"
              }}>
              
                {cashFlowForecast.projectedNet >= 0 ? "+" : ""}
                {cashFlowForecast.projectedNet.toLocaleString("ro-RO", {
                minimumFractionDigits: 2
              })}{" "}
                RON
              </Text>
              <Text className="text-text-muted text-xs">
                {t("analytics.cashflow.daysLeft", {
                count: cashFlowForecast.daysLeft
              })}
              </Text>
            </View>

            {}
            <View className="flex-row gap-3 mb-4">
              <View
              className="flex-1 rounded-2xl p-4"
              style={{
                backgroundColor: c.card,
                borderLeftWidth: 3,
                borderLeftColor: "#22C55E"
              }}>
              
                <Ionicons
                name="trending-up"
                size={15}
                color="#22C55E"
                style={{ marginBottom: 6 }} />
              
                <Text className="text-text-muted text-[10px] mb-0.5">
                  {t("analytics.cashflow.incomeToDate")}
                </Text>
                <Text className="text-success font-bold text-sm">
                  +
                  {cashFlowForecast.incomeToDate.toLocaleString("ro-RO", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}{" "}
                  RON
                </Text>
              </View>
              <View
              className="flex-1 rounded-2xl p-4"
              style={{
                backgroundColor: c.card,
                borderLeftWidth: 3,
                borderLeftColor: "#F43F5E"
              }}>
              
                <Ionicons
                name="trending-down"
                size={15}
                color="#F43F5E"
                style={{ marginBottom: 6 }} />
              
                <Text className="text-text-muted text-[10px] mb-0.5">
                  {t("analytics.cashflow.expensesToDate")}
                </Text>
                <Text className="text-expense font-bold text-sm">
                  -
                  {cashFlowForecast.expensesToDate.toLocaleString("ro-RO", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}{" "}
                  RON
                </Text>
              </View>
            </View>

            {}
            <View className="bg-surface rounded-2xl p-4 border border-border mb-4">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-foreground font-semibold text-sm">
                  {t("analytics.cashflow.savingsRate")}
                </Text>
                <Text
                className="font-bold text-sm"
                style={{
                  color:
                  cashFlowForecast.savingsRateToDate >= 20 ?
                  "#10B981" :
                  cashFlowForecast.savingsRateToDate >= 10 ?
                  "#F59E0B" :
                  "#F43F5E"
                }}>
                
                  {cashFlowForecast.savingsRateToDate}%
                </Text>
              </View>
              <View
              className="h-3 rounded-full overflow-hidden"
              style={{ backgroundColor: c.border }}>
              
                <View
                className="h-3 rounded-full"
                style={{
                  width: `${Math.min(Math.max(cashFlowForecast.savingsRateToDate, 0), 100)}%`,
                  backgroundColor:
                  cashFlowForecast.savingsRateToDate >= 20 ?
                  "#10B981" :
                  cashFlowForecast.savingsRateToDate >= 10 ?
                  "#F59E0B" :
                  "#F43F5E"
                }} />
              
              </View>
              <Text className="text-text-muted text-xs mt-2">
                {cashFlowForecast.savingsRateToDate >= 20 ?
              t("analytics.cashflow.savingsGood") :
              cashFlowForecast.savingsRateToDate >= 10 ?
              t("analytics.cashflow.savingsOk") :
              t("analytics.cashflow.savingsLow")}
              </Text>
            </View>

            {}
            <View className="bg-surface rounded-2xl p-4 border border-border mb-4">
              <Text className="text-foreground font-semibold text-sm mb-3">
                {t("analytics.cashflow.projection")}
              </Text>
              <View className="flex-row justify-between mb-2">
                <Text className="text-text-muted text-xs">
                  {t("analytics.cashflow.expectedIncome")}
                </Text>
                <Text className="text-success text-xs font-semibold">
                  +
                  {cashFlowForecast.extrapolatedIncome.toLocaleString("ro-RO", {
                  maximumFractionDigits: 0
                })}{" "}
                  RON
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-text-muted text-xs">
                  {t("analytics.cashflow.expectedExpenses")}
                </Text>
                <Text className="text-expense text-xs font-semibold">
                  -
                  {cashFlowForecast.extrapolatedExpenses.toLocaleString(
                  "ro-RO",
                  { maximumFractionDigits: 0 }
                )}{" "}
                  RON
                </Text>
              </View>
              {cashFlowForecast.remainingRecurring > 0 &&
            <View className="flex-row justify-between">
                  <Text className="text-text-muted text-xs">
                    {t("analytics.cashflow.recurringDue")}
                  </Text>
                  <Text className="text-[#F59E0B] text-xs font-semibold">
                    -
                    {cashFlowForecast.remainingRecurring.toLocaleString(
                  "ro-RO",
                  { maximumFractionDigits: 0 }
                )}{" "}
                    RON
                  </Text>
                </View>
            }
            </View>

            {}
            {cashFlowForecast.recurringItems.length > 0 &&
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
                <View className="px-4 pt-4 pb-2">
                  <Text className="text-foreground font-semibold text-sm">
                    {t("analytics.cashflow.upcomingRecurring")}
                  </Text>
                </View>
                {cashFlowForecast.recurringItems.map((item, idx) =>
            <View
              key={`${item.name}-${idx}`}
              className={`flex-row items-center px-4 py-3 ${
              idx < cashFlowForecast.recurringItems.length - 1 ?
              "border-t border-border" :
              ""}`
              }>
              
                    <View
                className="w-8 h-8 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${item.category.color}18` }}>
                
                      <Ionicons
                  name={item.category.icon}
                  size={15}
                  color={item.category.color} />
                
                    </View>
                    <View className="flex-1">
                      <Text
                  className="text-foreground text-sm font-medium"
                  numberOfLines={1}>
                  
                        {item.name}
                      </Text>
                      <Text className="text-text-muted text-[10px] mt-0.5">
                        {t("analytics.recurring.next")}{" "}
                        {new Date(item.nextDate).toLocaleDateString("ro-RO", {
                    day: "numeric",
                    month: "short"
                  })}
                      </Text>
                    </View>
                    <Text className="text-expense font-bold text-sm">
                      -
                      {item.amount.toLocaleString("ro-RO", {
                  minimumFractionDigits: 2
                })}
                    </Text>
                  </View>
            )}
              </View>
          }
          </View>
        }

        {}
        {activeView === "tranzactii" && hasData &&
        <View className="mx-6 mt-5">
            {barData.length > 0 &&
          <>
                <SectionHeader title={t("analytics.dailySpending")} />
                <View className="bg-surface rounded-2xl p-5 border border-border mb-5">
                  {shouldShowChartSkeleton ?
              <ChartSkeleton
                borderColor={c.border}
                tint={c.card}
                height={170} /> :


              <BarChart
                data={barData}
                width={SCREEN_WIDTH - 100}
                height={160}
                barWidth={barData.length > 15 ? 12 : 20}
                spacing={barData.length > 15 ? 6 : 12}
                noOfSections={4}
                barBorderRadius={6}
                yAxisColor="transparent"
                xAxisColor={c.chartAxisColor}
                yAxisTextStyle={{
                  color: c.chartAxisTextColor,
                  fontSize: 10
                }}
                xAxisLabelTextStyle={{
                  color: c.chartAxisTextColor,
                  fontSize: 9
                }}
                hideRules
                isAnimated
                animationDuration={600} />

              }
                </View>
              </>
          }
            <SectionHeader title={t("analytics.recentTransactions")} />
            <View className="bg-surface rounded-2xl border border-border overflow-hidden">
              {filteredTx.
            slice().
            sort(
              (a, b) => new Date(b.bookingDate) - new Date(a.bookingDate)
            ).
            map((tx, idx) =>
            <TransactionItem
              key={`${tx.connectionId || ""}-${tx.transactionId || idx}`}
              tx={tx}
              isLast={idx === filteredTx.length - 1}
              showCategory />

            )}
            </View>
          </View>
        }

        {}
        {activeView === "venituri" &&
        <View className="mx-6 mt-5">
            {}
            <View
            className="rounded-2xl p-5 mb-4"
            style={{
              backgroundColor: c.card,
              borderLeftWidth: 4,
              borderLeftColor: "#22C55E"
            }}>
            
              <Text className="text-text-muted text-xs mb-1">
                {t("analytics.income")} · {PERIODS[selectedPeriod]}
              </Text>
              <Text className="text-success font-bold text-2xl mb-1">
                +
                {totalIncome.toLocaleString("ro-RO", {
                minimumFractionDigits: 2
              })}{" "}
                RON
              </Text>
              {monthlyIncomeTrend.filter((m) => m.income > 0).length > 0 &&
            <Text className="text-text-muted text-xs">
                  {t("analytics.incomeDetails.avgMonthly")}:{" "}
                  {Math.round(
                monthlyIncomeTrend.reduce((s, m) => s + m.income, 0) /
                Math.max(
                  monthlyIncomeTrend.filter((m) => m.income > 0).length,
                  1
                )
              ).toLocaleString("ro-RO")}{" "}
                  RON
                </Text>
            }
            </View>

            {}
            {monthlyIncomeTrend.some((m) => m.income > 0) &&
          <View className="bg-surface rounded-2xl p-5 border border-border mb-4">
                <Text className="text-foreground font-semibold text-sm mb-4">
                  {t("analytics.incomeDetails.monthlyTrend")}
                </Text>
                {shouldShowChartSkeleton ?
            <ChartSkeleton
              borderColor={c.border}
              tint={c.card}
              height={170} /> :


            <BarChart
              data={incomeTrendBarData}
              width={SCREEN_WIDTH - 100}
              height={160}
              barWidth={28}
              spacing={14}
              noOfSections={4}
              barBorderRadius={6}
              yAxisColor="transparent"
              xAxisColor={c.chartAxisColor}
              yAxisTextStyle={{
                color: c.chartAxisTextColor,
                fontSize: 10
              }}
              xAxisLabelTextStyle={{
                color: c.chartAxisTextColor,
                fontSize: 9
              }}
              hideRules
              isAnimated
              animationDuration={600} />

            }
              </View>
          }

            {}
            <SectionHeader
            title={t("analytics.incomeDetails.incomeTransactions")} />
          
            {filteredTx.filter(
            (tx) => parseFloat(tx.transactionAmount?.amount || 0) > 0
          ).length > 0 ?
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
                {filteredTx.
            filter(
              (tx) => parseFloat(tx.transactionAmount?.amount || 0) > 0
            ).
            sort(
              (a, b) =>
              new Date(b.bookingDate) - new Date(a.bookingDate)
            ).
            map((tx, idx, arr) =>
            <TransactionItem
              key={`income-${tx.connectionId || ""}-${tx.transactionId || idx}`}
              tx={tx}
              isLast={idx === arr.length - 1}
              showCategory />

            )}
              </View> :

          <View
            className="rounded-2xl p-5"
            style={{
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: c.border
            }}>
            
                <View className="items-center">
                  <Ionicons
                name="wallet-outline"
                size={32}
                color={c.textMuted}
                style={{ marginBottom: 8 }} />
              
                  <Text className="text-text-muted text-sm">
                    {t("analytics.incomeDetails.noIncome")}
                  </Text>
                </View>
              </View>
          }
          </View>
        }

        {}
        {activeView === "cheltuieli" && hasData &&
        <View className="mx-6 mt-5">
            {}
            <View
            className="rounded-2xl p-5 mb-4"
            style={{
              backgroundColor: c.card,
              borderLeftWidth: 4,
              borderLeftColor: "#F43F5E"
            }}>
            
              <Text className="text-text-muted text-xs mb-1">
                {t("analytics.expenses")} · {PERIODS[selectedPeriod]}
              </Text>
              <Text className="text-expense font-bold text-2xl mb-1">
                -
                {totalExpenses.toLocaleString("ro-RO", {
                minimumFractionDigits: 2
              })}{" "}
                RON
              </Text>
              {spendingInsights &&
            <Text className="text-text-muted text-xs">
                  {t("analytics.avgDaily")}:{" "}
                  {spendingInsights.avgDaily.toLocaleString("ro-RO", {
                maximumFractionDigits: 0
              })}{" "}
                  RON/{t("analytics.expenseDetails.perDay")}
                </Text>
            }
            </View>

            {}
            {barData.length > 0 &&
          <View className="bg-surface rounded-2xl p-5 border border-border mb-4">
                <Text className="text-foreground font-semibold text-sm mb-4">
                  {t("analytics.dailySpending")}
                </Text>
                {shouldShowChartSkeleton ?
            <ChartSkeleton
              borderColor={c.border}
              tint={c.card}
              height={170} /> :


            <BarChart
              data={barData}
              width={SCREEN_WIDTH - 100}
              height={160}
              barWidth={barData.length > 15 ? 12 : 20}
              spacing={barData.length > 15 ? 6 : 12}
              noOfSections={4}
              barBorderRadius={6}
              yAxisColor="transparent"
              xAxisColor={c.chartAxisColor}
              yAxisTextStyle={{
                color: c.chartAxisTextColor,
                fontSize: 10
              }}
              xAxisLabelTextStyle={{
                color: c.chartAxisTextColor,
                fontSize: 9
              }}
              hideRules
              isAnimated
              animationDuration={600} />

            }
              </View>
          }

            {}
            {categoryData.length > 0 &&
          <CategoryBreakdownWithPie
            categoryData={categoryData}
            pieData={pieData}
            totalExpenses={totalExpenses}
            shouldShowChartSkeleton={shouldShowChartSkeleton}
            setSelectedCategory={setSelectedCategory}
            c={c}
            isDark={isDark}
            t={t} />

          }
          </View>
        }

        {}
        {activeView === "buget" &&
        <View className="mx-6 mt-5">
            <BudgetVsActualCard
            budgetVsActualData={budgetVsActualData}
            c={c}
            isDark={isDark}
            t={t} />
          
          </View>
        }
      </ScrollView>

      {}
      <BottomSheet
        visible={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}>
        
        {selectedCategory &&
        <View>
            <View className="flex-row items-center mb-4">
              <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: `${selectedCategory.color}18` }}>
              
                <Ionicons
                name={selectedCategory.icon}
                size={20}
                color={selectedCategory.color} />
              
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-bold text-base">
                  {t("analytics.categoryDetails", {
                  category: t(`analytics.categories.${selectedCategory.key}`)
                })}
                </Text>
                <Text className="text-text-muted text-xs mt-0.5">
                  {selectedCategory.count} {t("analytics.transactions")} •{" "}
                  {selectedCategory.total.toLocaleString("ro-RO", {
                  minimumFractionDigits: 2
                })}{" "}
                  RON
                </Text>
              </View>
            </View>
            <View
            style={{ maxHeight: 350 }}
            className="bg-background rounded-2xl border border-border overflow-hidden">
            
              {categoryTransactions.length === 0 ?
            <View className="p-6 items-center">
                  <Text className="text-text-muted text-sm">
                    {t("analytics.noTransactionsInCategory")}
                  </Text>
                </View> :

            <FlatList
              data={categoryTransactions}
              keyExtractor={(tx, idx) =>
              `${tx.connectionId || ""}-${tx.transactionId || idx}`
              }
              renderItem={({ item: tx, index }) =>
              <TransactionItem
                tx={tx}
                isLast={index === categoryTransactions.length - 1} />

              }
              showsVerticalScrollIndicator={false} />

            }
            </View>
          </View>
        }
      </BottomSheet>
    </View>);

}