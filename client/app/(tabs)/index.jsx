import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import i18n from "../../i18n/i18n";
import { useBankData } from "../../context/BankContext"; import { getCategoryBreakdown } from "../../utils/categoryUtils";
import SectionHeader from "../../components/SectionHeader";
import TransactionItem from "../../components/TransactionItem";

import { useTheme } from "../../context/ThemeContext";

export default function Dashboard() {
    const { isDark, theme } = useTheme();
    const c = theme.colors;
    const { t } = useTranslation();
    const { user } = useAuth();
    const router = useRouter();
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
            0
        );

    const totalExpenses = monthlyTx
        .filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0)
        .reduce(
            (sum, tx) => sum + Math.abs(parseFloat(tx.transactionAmount?.amount || 0)),
            0
        );

    const currentLang = i18n.language?.startsWith("ro") ? "ro" : "en";

    // Top spending categories
    const categoryBreakdown = getCategoryBreakdown(monthlyTx).slice(0, 3);

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
                        <View className="w-8 h-8 rounded-xl bg-primary/[0.12] items-center justify-center">
                            <Ionicons
                                name="person"
                                size={15}
                                color="#10B981"
                            />
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
                                    <Ionicons
                                        name="link"
                                        size={28}
                                        color="#fff"
                                    />
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
                        <View className="rounded-3xl overflow-hidden mt-4 mb-5">
                            <LinearGradient
                                colors={["#10B981", "#059669", "#047857"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{
                                    padding: 28,
                                    borderRadius: 24,
                                }}
                            >
                                {/* Decorative circles */}
                                <View
                                    style={{
                                        position: "absolute",
                                        top: -30,
                                        right: -30,
                                        width: 120,
                                        height: 120,
                                        borderRadius: 60,
                                        backgroundColor: "rgba(255,255,255,0.08)",
                                    }}
                                />
                                <View
                                    style={{
                                        position: "absolute",
                                        bottom: -20,
                                        left: -20,
                                        width: 80,
                                        height: 80,
                                        borderRadius: 40,
                                        backgroundColor: "rgba(255,255,255,0.05)",
                                    }}
                                />

                                <Text className="text-foreground/70 text-sm font-medium">
                                    {t("dashboard.totalBalance")}
                                </Text>
                                <Text className="text-foreground text-4xl font-extrabold mt-2">
                                    {totalBalance.toLocaleString("ro-RO", {
                                        minimumFractionDigits: 2,
                                    })}{" "}
                                    <Text className="text-foreground/50 text-lg font-normal">
                                        RON
                                    </Text>
                                </Text>

                                {/* Account info */}
                                {accounts[0] && (
                                    <View className="flex-row items-center mt-3 bg-white/[0.12] rounded-xl px-3 py-2 self-start">
                                        <Ionicons
                                            name="business"
                                            size={14}
                                            color="rgba(255,255,255,0.7)"
                                        />
                                        <Text className="text-foreground/70 text-xs ml-2 font-medium">
                                            {accounts[0].name ||
                                                "Banca Transilvania"}
                                        </Text>
                                    </View>
                                )}

                                {/* Income / Expenses row */}
                                <View className="flex-row mt-5 pt-4 border-t border-border">
                                    <View className="flex-1 flex-row items-center">
                                        <View className="w-8 h-8 rounded-lg bg-white/[0.15] items-center justify-center mr-2">
                                            <Ionicons
                                                name="arrow-down"
                                                size={16}
                                                color="#fff"
                                            />
                                        </View>
                                        <View>
                                            <Text className="text-foreground/60 text-xs">
                                                {t("dashboard.income")}
                                            </Text>
                                            <Text className="text-foreground font-bold text-sm">
                                                +
                                                {totalIncome.toLocaleString(
                                                    "ro-RO",
                                                    {
                                                        minimumFractionDigits: 2,
                                                    }
                                                )}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="flex-1 flex-row items-center">
                                        <View className="w-8 h-8 rounded-lg bg-white/[0.15] items-center justify-center mr-2">
                                            <Ionicons
                                                name="arrow-up"
                                                size={16}
                                                color="#fff"
                                            />
                                        </View>
                                        <View>
                                            <Text className="text-foreground/60 text-xs">
                                                {t("dashboard.expenses")}
                                            </Text>
                                            <Text className="text-foreground font-bold text-sm">
                                                -
                                                {totalExpenses.toLocaleString(
                                                    "ro-RO",
                                                    {
                                                        minimumFractionDigits: 2,
                                                    }
                                                )}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </LinearGradient>
                        </View>

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
                                            className={`flex-row items-center py-2.5 ${idx <
                                                categoryBreakdown.length - 1
                                                ? "border-b border-border"
                                                : ""
                                                }`}
                                        >
                                            <View
                                                className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                                                style={{
                                                    backgroundColor: `${cat.color}18`,
                                                }}
                                            >
                                                <Ionicons
                                                    name={cat.icon}
                                                    size={16}
                                                    color={cat.color}
                                                />
                                            </View>
                                            <Text className="text-foreground text-sm font-medium flex-1">
                                                {t(
                                                    `analytics.categories.${cat.key}`
                                                )}
                                            </Text>
                                            <Text className="text-text-muted text-xs mr-3">
                                                {cat.percentage}%
                                            </Text>
                                            <Text className="text-foreground font-semibold text-sm">
                                                {cat.total.toLocaleString(
                                                    "ro-RO",
                                                    {
                                                        minimumFractionDigits: 2,
                                                    }
                                                )}{" "}
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
                            onPress={() =>
                                router.push("/(tabs)/analytics")
                            }
                        />

                        {recentTransactions.length === 0 && (
                            <Text className="text-text-muted text-sm">
                                {t("dashboard.noTransactions")}
                            </Text>
                        )}

                        <View className="bg-surface rounded-2xl border border-border overflow-hidden">
                            {recentTransactions.map((tx, index) => (
                                <TransactionItem
                                    key={`${tx.connectionId || ''}-${tx.transactionId || index}`}
                                    tx={tx}
                                    isLast={
                                        index ===
                                        recentTransactions.length - 1
                                    }
                                />
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
