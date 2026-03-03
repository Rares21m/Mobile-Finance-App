import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { BarChart, PieChart } from "react-native-gifted-charts";
import BottomSheet from "../../components/BottomSheet";
import SectionHeader from "../../components/SectionHeader";
import TransactionItem from "../../components/TransactionItem";
import { useBankData } from "../../context/BankContext";
import { useBudget } from "../../context/BudgetContext";
import { useTheme } from "../../context/ThemeContext";
import {
  categorizeTransaction,
  detectRecurringTransactions,
  filterByPeriod,
  getCategoryBreakdown,
  getDailyExpenses,
} from "../../utils/categoryUtils";
import { exportFinancialReport } from "../../utils/exportPdf";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function Analytics() {
  const { isDark, theme } = useTheme();
  const c = theme.colors;
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [activeView, setActiveView] = useState(null);
  const { transactions } = useBankData();
  const { getBudgetSummary } = useBudget();

  const PERIODS = [
    t("analytics.thisMonth"),
    t("analytics.lastMonth"),
    t("analytics.threeMonths"),
  ];

  const filteredTx = useMemo(
    () => filterByPeriod(transactions, selectedPeriod),
    [transactions, selectedPeriod],
  );

  const totalExpenses = useMemo(
    () =>
      filteredTx
        .filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0)
        .reduce(
          (sum, tx) =>
            sum + Math.abs(parseFloat(tx.transactionAmount?.amount || 0)),
          0,
        ),
    [filteredTx],
  );

  const totalIncome = useMemo(
    () =>
      filteredTx
        .filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) > 0)
        .reduce(
          (sum, tx) => sum + parseFloat(tx.transactionAmount?.amount || 0),
          0,
        ),
    [filteredTx],
  );

  const categoryData = useMemo(
    () => getCategoryBreakdown(filteredTx),
    [filteredTx],
  );

  const dailyData = useMemo(() => getDailyExpenses(filteredTx), [filteredTx]);

  const spendingInsights = useMemo(() => {
    const expenseTx = filteredTx.filter(
      (tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0,
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
      (a, b) => b[1] - a[1],
    )[0];

    const lastMonthTx = filterByPeriod(transactions, 1);
    const lastMonthExpenses = lastMonthTx
      .filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0)
      .reduce(
        (sum, tx) =>
          sum + Math.abs(parseFloat(tx.transactionAmount?.amount || 0)),
        0,
      );
    const percentChange =
      lastMonthExpenses > 0
        ? ((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
        : 0;

    return {
      avgDaily,
      topMerchant: topMerchant ? topMerchant[0] : null,
      topMerchantCount: topMerchant ? topMerchant[1] : 0,
      percentChange,
      lastMonthExpenses,
    };
  }, [filteredTx, totalExpenses, transactions]);

  const recurringTransactions = useMemo(
    () => detectRecurringTransactions(transactions),
    [transactions],
  );

  const totalMonthlyRecurring = useMemo(
    () => recurringTransactions.reduce((sum, r) => sum + r.monthlyEstimate, 0),
    [recurringTransactions],
  );

  const categoryTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return filteredTx
      .filter((tx) => {
        const cat = categorizeTransaction(tx);
        return cat.key === selectedCategory.key;
      })
      .sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));
  }, [filteredTx, selectedCategory]);

  const pieData = useMemo(() => {
    if (categoryData.length === 0) return [];
    return categoryData.map((cat) => ({
      value: cat.total,
      color: cat.color,
      text: `${cat.percentage}%`,
      textColor: "#fff",
      textSize: 10,
    }));
  }, [categoryData]);

  const barData = useMemo(
    () =>
      dailyData.map((d) => ({
        value: d.value,
        label: d.label,
        frontColor: "#10B981",
        gradientColor: "#059669",
        topLabelComponent: () => (
          <Text
            style={{
              color: c.chartAxisTextColor,
              fontSize: 9,
              marginBottom: 2,
            }}
          >
            {d.value > 0 ? Math.round(d.value) : ""}
          </Text>
        ),
      })),
    [dailyData, isDark],
  );

  const hasData = filteredTx.length > 0;

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
          other: t("analytics.categories.other"),
        },
      };
      await exportFinancialReport({
        filteredTx,
        categoryData,
        totalIncome,
        totalExpenses,
        spendingInsights,
        budgetSummary: getBudgetSummary(),
        periodLabel: PERIODS[selectedPeriod],
        labels,
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
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top bar ── */}
        <View className="flex-row mx-6 mt-14 gap-3 items-center">
          {activeView ? (
            <>
              <Pressable
                onPress={goBack}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: `${c.primary}15`,
                  borderWidth: 1,
                  borderColor: `${c.primary}25`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="arrow-back" size={18} color={c.primary} />
              </Pressable>
              <View className="flex-1">
                <Text className="text-foreground font-bold text-base">
                  {VIEW_LABELS[activeView]}
                </Text>
                <Text className="text-text-muted text-xs">
                  {PERIODS[selectedPeriod]}
                </Text>
              </View>
            </>
          ) : (
            <View className="flex-1 bg-surface rounded-2xl p-1.5 border border-border flex-row">
              {PERIODS.map((period, idx) => (
                <Pressable
                  key={period}
                  className="flex-1 py-2.5 rounded-xl items-center overflow-hidden"
                  onPress={() => setSelectedPeriod(idx)}
                >
                  {selectedPeriod === idx && (
                    <LinearGradient
                      colors={["#10B981", "#059669"]}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: 12,
                      }}
                    />
                  )}
                  <Text
                    className={`text-xs font-semibold ${
                      selectedPeriod === idx
                        ? "text-foreground"
                        : "text-text-muted"
                    }`}
                  >
                    {period}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {!activeView && (
            <Pressable
              onPress={handleExport}
              disabled={exporting || !hasData}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: `${c.primary}18`,
                borderWidth: 1,
                borderColor: `${c.primary}30`,
                alignItems: "center",
                justifyContent: "center",
                opacity: exporting || !hasData ? 0.4 : 1,
              }}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={c.primary} />
              ) : (
                <Ionicons name="download-outline" size={19} color={c.primary} />
              )}
            </Pressable>
          )}
        </View>

        {/* ── Income & Expenses cards ── */}
        <View className="flex-row mx-6 mt-5 gap-3">
          <View
            className="flex-1 rounded-2xl p-4"
            style={{
              backgroundColor: c.card,
              borderLeftWidth: 3,
              borderLeftColor: "#22C55E",
            }}
          >
            <View className="flex-row items-center mb-3">
              <Ionicons
                name="trending-up"
                size={15}
                color="#22C55E"
                style={{ marginRight: 6 }}
              />
              <Text className="text-text-muted text-xs">
                {t("analytics.income")}
              </Text>
            </View>
            <Text className="text-success font-bold text-lg">
              +
              {totalIncome.toLocaleString("ro-RO", {
                minimumFractionDigits: 2,
              })}
            </Text>
            <Text className="text-text-muted text-xs mt-0.5">RON</Text>
          </View>

          <View
            className="flex-1 rounded-2xl p-4"
            style={{
              backgroundColor: c.card,
              borderLeftWidth: 3,
              borderLeftColor: "#F43F5E",
            }}
          >
            <View className="flex-row items-center mb-3">
              <Ionicons
                name="trending-down"
                size={15}
                color="#F43F5E"
                style={{ marginRight: 6 }}
              />
              <Text className="text-text-muted text-xs">
                {t("analytics.expenses")}
              </Text>
            </View>
            <Text className="text-expense font-bold text-lg">
              -
              {totalExpenses.toLocaleString("ro-RO", {
                minimumFractionDigits: 2,
              })}
            </Text>
            <Text className="text-text-muted text-xs mt-0.5">RON</Text>
          </View>
        </View>

        {/* ── No data ── */}
        {!hasData && !activeView && (
          <View
            className="mx-6 mt-6 rounded-2xl p-5"
            style={{
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: c.border,
            }}
          >
            <View className="flex-row items-center">
              <View className="flex-1 pr-4">
                <Text className="text-foreground font-bold text-base mb-1">
                  {t("analytics.noData")}
                </Text>
                <Text className="text-text-muted text-sm leading-5">
                  {t("analytics.noDataDesc")}
                </Text>
              </View>
              <Ionicons
                name="stats-chart-outline"
                size={44}
                color={c.textMuted}
              />
            </View>
          </View>
        )}

        {/* ══════════ OVERVIEW ══════════ */}
        {hasData && !activeView && (
          <>
            {spendingInsights && (
              <View className="mx-6 mt-5">
                <SectionHeader title={t("analytics.spendingInsights")} />
                <View className="flex-row gap-3">
                  <View
                    className="flex-1 rounded-2xl p-4"
                    style={{
                      backgroundColor: c.card,
                      borderLeftWidth: 3,
                      borderLeftColor: "#3B82F6",
                    }}
                  >
                    <Ionicons
                      name="calendar"
                      size={15}
                      color="#3B82F6"
                      style={{ marginBottom: 8 }}
                    />
                    <Text className="text-text-muted text-xs mb-1">
                      {t("analytics.avgDaily")}
                    </Text>
                    <Text className="text-foreground font-bold text-base">
                      {spendingInsights.avgDaily.toLocaleString("ro-RO", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}{" "}
                      <Text className="text-text-muted font-normal text-xs">
                        RON
                      </Text>
                    </Text>
                  </View>

                  {selectedPeriod !== 1 && (
                    <View
                      className="flex-1 rounded-2xl p-4"
                      style={{
                        backgroundColor: c.card,
                        borderLeftWidth: 3,
                        borderLeftColor:
                          spendingInsights.percentChange <= 0
                            ? "#22C55E"
                            : "#F43F5E",
                      }}
                    >
                      <Ionicons
                        name={
                          spendingInsights.percentChange <= 0
                            ? "arrow-down"
                            : "arrow-up"
                        }
                        size={15}
                        color={
                          spendingInsights.percentChange <= 0
                            ? "#22C55E"
                            : "#F43F5E"
                        }
                        style={{ marginBottom: 8 }}
                      />
                      <Text className="text-text-muted text-xs mb-1">
                        {t("analytics.vsLastMonth")}
                      </Text>
                      <Text
                        className={`font-bold text-base ${
                          spendingInsights.percentChange <= 0
                            ? "text-success"
                            : "text-expense"
                        }`}
                      >
                        {spendingInsights.percentChange > 0 ? "+" : ""}
                        {spendingInsights.percentChange.toFixed(0)}%
                      </Text>
                    </View>
                  )}
                </View>

                {spendingInsights.topMerchant &&
                  spendingInsights.topMerchantCount > 1 && (
                    <View
                      className="rounded-2xl p-4 mt-3 flex-row items-center"
                      style={{
                        backgroundColor: c.card,
                        borderLeftWidth: 3,
                        borderLeftColor: "#8B5CF6",
                      }}
                    >
                      <Ionicons
                        name="star"
                        size={16}
                        color="#8B5CF6"
                        style={{ marginRight: 12 }}
                      />
                      <View className="flex-1">
                        <Text className="text-text-muted text-xs">
                          {t("analytics.topMerchant")}
                        </Text>
                        <Text
                          className="text-foreground font-semibold text-sm mt-0.5"
                          numberOfLines={1}
                        >
                          {spendingInsights.topMerchant}
                        </Text>
                      </View>
                      <View className="bg-[#8B5CF6]/10 px-3 py-1 rounded-full">
                        <Text className="text-[#8B5CF6] text-xs font-semibold">
                          {spendingInsights.topMerchantCount}x
                        </Text>
                      </View>
                    </View>
                  )}
              </View>
            )}

            {/* Quick-access tiles */}
            <View className="mx-6 mt-5">
              <SectionHeader title={t("analytics.quickAccess")} />
              <View className="flex-row flex-wrap gap-3">
                <Pressable
                  className="active:opacity-70"
                  style={{ width: (SCREEN_WIDTH - 60) / 2 }}
                  onPress={() => openSubView("categorii")}
                >
                  <LinearGradient
                    colors={["#8B5CF620", "#8B5CF608"]}
                    style={{
                      borderRadius: 20,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: "#8B5CF630",
                    }}
                  >
                    <View className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 items-center justify-center mb-3">
                      <Ionicons name="pie-chart" size={20} color="#8B5CF6" />
                    </View>
                    <Text className="text-foreground font-bold text-sm mb-0.5">
                      {t("analytics.fab.categorii")}
                    </Text>
                    <Text className="text-text-muted text-xs">
                      {categoryData.length} {t("analytics.categories.count")}
                    </Text>
                    <View style={{ position: "absolute", top: 12, right: 12 }}>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="#8B5CF6"
                      />
                    </View>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  className="active:opacity-70"
                  style={{ width: (SCREEN_WIDTH - 60) / 2 }}
                  onPress={() => openSubView("recurente")}
                >
                  <LinearGradient
                    colors={["#F59E0B20", "#F59E0B08"]}
                    style={{
                      borderRadius: 20,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: "#F59E0B30",
                    }}
                  >
                    <View className="w-10 h-10 rounded-xl bg-[#F59E0B]/20 items-center justify-center mb-3">
                      <Ionicons name="repeat" size={20} color="#F59E0B" />
                    </View>
                    <Text className="text-foreground font-bold text-sm mb-0.5">
                      {t("analytics.fab.recurente")}
                    </Text>
                    <Text className="text-text-muted text-xs" numberOfLines={1}>
                      {recurringTransactions.length > 0
                        ? `${totalMonthlyRecurring.toLocaleString("ro-RO", {
                            maximumFractionDigits: 0,
                          })} RON/${t("analytics.recurring.mo")}`
                        : t("analytics.recurring.none")}
                    </Text>
                    <View style={{ position: "absolute", top: 12, right: 12 }}>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="#F59E0B"
                      />
                    </View>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  className="active:opacity-70"
                  style={{ width: (SCREEN_WIDTH - 60) / 2 }}
                  onPress={() => openSubView("tranzactii")}
                >
                  <LinearGradient
                    colors={["#3B82F620", "#3B82F608"]}
                    style={{
                      borderRadius: 20,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: "#3B82F630",
                    }}
                  >
                    <View className="w-10 h-10 rounded-xl bg-[#3B82F6]/20 items-center justify-center mb-3">
                      <Ionicons name="list" size={20} color="#3B82F6" />
                    </View>
                    <Text className="text-foreground font-bold text-sm mb-0.5">
                      {t("analytics.fab.tranzactii")}
                    </Text>
                    <Text className="text-text-muted text-xs">
                      {filteredTx.length} {t("analytics.transactions")}
                    </Text>
                    <View style={{ position: "absolute", top: 12, right: 12 }}>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="#3B82F6"
                      />
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </>
        )}

        {/* ══════════ SUB-VIEW: CATEGORII ══════════ */}
        {activeView === "categorii" && hasData && (
          <View className="mx-6 mt-5">
            {categoryData.length > 0 ? (
              <View className="bg-surface rounded-2xl p-5 border border-border">
                <View className="items-center mb-5">
                  <PieChart
                    data={pieData}
                    donut
                    radius={90}
                    innerRadius={55}
                    innerCircleColor={c.chartInnerCircle}
                    centerLabelComponent={() => (
                      <View className="items-center">
                        <Text className="text-foreground text-lg font-bold">
                          {totalExpenses.toLocaleString("ro-RO", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </Text>
                        <Text className="text-text-muted text-xs">
                          {t("common.currency")}
                        </Text>
                      </View>
                    )}
                  />
                </View>
                {categoryData.map((cat) => (
                  <Pressable
                    key={cat.key}
                    className="flex-row items-center py-2.5 border-t border-border active:opacity-60"
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: `${cat.color}18` }}
                    >
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
                            minimumFractionDigits: 2,
                          })}
                        </Text>
                        <Text className="text-text-muted text-xs mt-0.5">
                          {cat.percentage}%
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={c.textMuted}
                      />
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View className="bg-surface rounded-2xl p-8 border border-border items-center">
                <Text className="text-text-muted text-sm">
                  {t("analytics.noData")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ══════════ SUB-VIEW: RECURENTE ══════════ */}
        {activeView === "recurente" && (
          <View className="mx-6 mt-5">
            {recurringTransactions.length > 0 ? (
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
                        minimumFractionDigits: 2,
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
                  {recurringTransactions.map((item, idx) => (
                    <View
                      key={`${item.name}-${idx}`}
                      className={`flex-row items-center p-4 ${
                        idx < recurringTransactions.length - 1
                          ? "border-b border-border"
                          : ""
                      }`}
                    >
                      <View
                        className="w-9 h-9 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: `${item.category.color}18` }}
                      >
                        <Ionicons
                          name={item.category.icon}
                          size={17}
                          color={item.category.color}
                        />
                      </View>
                      <View className="flex-1 mr-2">
                        <Text
                          className="text-foreground font-semibold text-sm"
                          numberOfLines={1}
                        >
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
                              { day: "numeric", month: "short" },
                            )}
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-expense font-bold text-sm">
                          -
                          {item.amount.toLocaleString("ro-RO", {
                            minimumFractionDigits: 2,
                          })}
                        </Text>
                        <Text className="text-text-muted text-[10px] mt-0.5">
                          {item.occurrences}x
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View
                className="rounded-2xl p-5"
                style={{
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: c.border,
                }}
              >
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
                    color={c.textMuted}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* ══════════ SUB-VIEW: TRANZACȚII ══════════ */}
        {activeView === "tranzactii" && hasData && (
          <View className="mx-6 mt-5">
            {barData.length > 0 && (
              <>
                <SectionHeader title={t("analytics.dailySpending")} />
                <View className="bg-surface rounded-2xl p-5 border border-border mb-5">
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
                      fontSize: 10,
                    }}
                    xAxisLabelTextStyle={{
                      color: c.chartAxisTextColor,
                      fontSize: 9,
                    }}
                    hideRules
                    isAnimated
                    animationDuration={600}
                  />
                </View>
              </>
            )}
            <SectionHeader title={t("analytics.recentTransactions")} />
            <View className="bg-surface rounded-2xl border border-border overflow-hidden">
              {filteredTx
                .slice()
                .sort(
                  (a, b) => new Date(b.bookingDate) - new Date(a.bookingDate),
                )
                .map((tx, idx) => (
                  <TransactionItem
                    key={`${tx.connectionId || ""}-${tx.transactionId || idx}`}
                    tx={tx}
                    isLast={idx === filteredTx.length - 1}
                    showCategory
                  />
                ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Category Detail Bottom Sheet ── */}
      <BottomSheet
        visible={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
      >
        {selectedCategory && (
          <View>
            <View className="flex-row items-center mb-4">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${selectedCategory.color}18` }}
              >
                <Ionicons
                  name={selectedCategory.icon}
                  size={20}
                  color={selectedCategory.color}
                />
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-bold text-base">
                  {t("analytics.categoryDetails", {
                    category: t(`analytics.categories.${selectedCategory.key}`),
                  })}
                </Text>
                <Text className="text-text-muted text-xs mt-0.5">
                  {selectedCategory.count} {t("analytics.transactions")} •{" "}
                  {selectedCategory.total.toLocaleString("ro-RO", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  RON
                </Text>
              </View>
            </View>
            <View
              style={{ maxHeight: 350 }}
              className="bg-background rounded-2xl border border-border overflow-hidden"
            >
              {categoryTransactions.length === 0 ? (
                <View className="p-6 items-center">
                  <Text className="text-text-muted text-sm">
                    {t("analytics.noTransactionsInCategory")}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={categoryTransactions}
                  keyExtractor={(tx, idx) =>
                    `${tx.connectionId || ""}-${tx.transactionId || idx}`
                  }
                  renderItem={({ item: tx, index }) => (
                    <TransactionItem
                      tx={tx}
                      isLast={index === categoryTransactions.length - 1}
                    />
                  )}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}
