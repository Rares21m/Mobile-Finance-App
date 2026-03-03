import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "react-i18next";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import { BarChart, PieChart } from "react-native-gifted-charts";
import { useBankData } from "../../context/BankContext";
import {
    filterByPeriod,
    getCategoryBreakdown,
    getDailyExpenses,
} from "../../utils/categoryUtils";
import SectionHeader from "../../components/SectionHeader";
import TransactionItem from "../../components/TransactionItem";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function Analytics() {
    const { isDark, theme } = useTheme();
    const c = theme.colors;
    const { t } = useTranslation();
    const [selectedPeriod, setSelectedPeriod] = useState(0);
    const { transactions } = useBankData();

    const PERIODS = [
        t("analytics.thisMonth"),
        t("analytics.lastMonth"),
        t("analytics.threeMonths"),
    ];

    // Filter transactions by selected period
    const filteredTx = useMemo(
        () => filterByPeriod(transactions, selectedPeriod),
        [transactions, selectedPeriod]
    );

    const totalExpenses = useMemo(() => {
        return filteredTx
            .filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0)
            .reduce(
                (sum, tx) =>
                    sum +
                    Math.abs(parseFloat(tx.transactionAmount?.amount || 0)),
                0
            );
    }, [filteredTx]);

    const totalIncome = useMemo(() => {
        return filteredTx
            .filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) > 0)
            .reduce(
                (sum, tx) =>
                    sum + parseFloat(tx.transactionAmount?.amount || 0),
                0
            );
    }, [filteredTx]);

    // Category breakdown for pie chart
    const categoryData = useMemo(
        () => getCategoryBreakdown(filteredTx),
        [filteredTx]
    );

    // Daily expenses for bar chart
    const dailyData = useMemo(
        () => getDailyExpenses(filteredTx),
        [filteredTx]
    );

    // Pie chart data
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

    // Bar chart data with emerald color
    const barData = useMemo(() => {
        return dailyData.map((d) => ({
            value: d.value,
            label: d.label,
            frontColor: "#10B981",
            gradientColor: "#059669",
            topLabelComponent: () => (
                <Text style={{ color: c.chartAxisTextColor, fontSize: 9, marginBottom: 2 }}>
                    {d.value > 0 ? Math.round(d.value) : ""}
                </Text>
            ),
        }));
    }, [dailyData, isDark]);

    const hasData = filteredTx.length > 0;

    return (
        <View className="flex-1 bg-background">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View className="px-6 pt-14 pb-2">
                    <Text className="text-foreground text-2xl font-bold">
                        {t("analytics.title")}
                    </Text>
                    <Text className="text-text-muted text-sm mt-1">
                        {t("analytics.subtitle")}
                    </Text>
                </View>

                {/* Period Selector */}
                <View className="flex-row mx-6 mt-4 bg-surface rounded-2xl p-1.5 border border-border">
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
                                className={`text-xs font-semibold ${selectedPeriod === idx
                                    ? "text-foreground"
                                    : "text-text-muted"
                                    }`}
                            >
                                {period}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* Income & Expenses cards */}
                <View className="flex-row mx-6 mt-5 gap-3">
                    <View className="flex-1 bg-surface rounded-2xl p-4 border border-border">
                        <View className="flex-row items-center mb-3">
                            <View className="w-8 h-8 rounded-lg bg-success/15 items-center justify-center mr-2">
                                <Ionicons
                                    name="trending-up"
                                    size={16}
                                    color="#22C55E"
                                />
                            </View>
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
                        <Text className="text-text-muted text-xs mt-0.5">
                            RON
                        </Text>
                    </View>
                    <View className="flex-1 bg-surface rounded-2xl p-4 border border-border">
                        <View className="flex-row items-center mb-3">
                            <View className="w-8 h-8 rounded-lg bg-expense/15 items-center justify-center mr-2">
                                <Ionicons
                                    name="trending-down"
                                    size={16}
                                    color="#F43F5E"
                                />
                            </View>
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
                        <Text className="text-text-muted text-xs mt-0.5">
                            RON
                        </Text>
                    </View>
                </View>

                {!hasData ? (
                    /* Empty state */
                    <View className="mx-6 mt-6 bg-primary/[0.08] rounded-3xl p-7 border border-primary/20 items-center">
                        <View className="w-16 h-16 rounded-2xl bg-primary/15 items-center justify-center mb-4">
                            <Ionicons
                                name="stats-chart"
                                size={32}
                                color="#10B981"
                            />
                        </View>
                        <Text className="text-foreground font-bold text-lg text-center">
                            {t("analytics.noData")}
                        </Text>
                        <Text className="text-text-muted text-sm mt-3 text-center leading-5">
                            {t("analytics.noDataDesc")}
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Pie Chart — Category Breakdown */}
                        {categoryData.length > 0 && (
                            <View className="mx-6 mt-5">
                                <SectionHeader
                                    title={t("analytics.byCategory")}
                                />
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
                                                        {totalExpenses.toLocaleString(
                                                            "ro-RO",
                                                            {
                                                                minimumFractionDigits: 0,
                                                                maximumFractionDigits: 0,
                                                            }
                                                        )}
                                                    </Text>
                                                    <Text className="text-text-muted text-xs">
                                                        {t("common.currency")}
                                                    </Text>
                                                </View>
                                            )}
                                        />
                                    </View>

                                    {/* Legend */}
                                    {categoryData.map((cat) => (
                                        <View
                                            key={cat.key}
                                            className="flex-row items-center py-2.5 border-t border-border"
                                        >
                                            <View
                                                className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                                                style={{
                                                    backgroundColor: `${cat.color}20`,
                                                }}
                                            >
                                                <Ionicons
                                                    name={cat.icon}
                                                    size={16}
                                                    color={cat.color}
                                                />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-foreground text-sm font-medium">
                                                    {t(
                                                        `analytics.categories.${cat.key}`
                                                    )}
                                                </Text>
                                                <Text className="text-text-muted text-xs mt-0.5">
                                                    {cat.count}{" "}
                                                    {t(
                                                        "analytics.transactions"
                                                    )}
                                                </Text>
                                            </View>
                                            <View className="items-end">
                                                <Text className="text-foreground font-semibold text-sm">
                                                    {cat.total.toLocaleString(
                                                        "ro-RO",
                                                        {
                                                            minimumFractionDigits: 2,
                                                        }
                                                    )}
                                                </Text>
                                                <Text className="text-text-muted text-xs mt-0.5">
                                                    {cat.percentage}%
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Bar Chart — Daily Spending */}
                        {barData.length > 0 && (
                            <View className="mx-6 mt-5">
                                <SectionHeader
                                    title={t("analytics.dailySpending")}
                                />
                                <View className="bg-surface rounded-2xl p-5 border border-border">
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
                                        yAxisTextStyle={{ color: c.chartAxisTextColor, fontSize: 10 }}
                                        xAxisLabelTextStyle={{ color: c.chartAxisTextColor, fontSize: 9 }}
                                        hideRules
                                        isAnimated
                                        animationDuration={600}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Recent Transactions with Categories */}
                        <View className="px-6 mt-6">
                            <SectionHeader
                                title={t("analytics.recentTransactions")}
                            />
                            <View className="bg-surface rounded-2xl border border-border overflow-hidden">
                                {filteredTx.slice(0, 15).map((tx, idx) => (
                                    <TransactionItem
                                        key={`${tx.connectionId || ''}-${tx.transactionId || idx}`}
                                        tx={tx}
                                        isLast={
                                            idx ===
                                            Math.min(filteredTx.length, 15) - 1
                                        }
                                        showCategory
                                    />
                                ))}
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}
