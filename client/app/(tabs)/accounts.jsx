import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { WebView } from "react-native-webview";

import { useBankData } from "../../context/BankContext";
import { getErrorKey } from "../../utils/errorCodes";
import api from "../../services/api";
import SectionHeader from "../../components/SectionHeader";

export default function Accounts() {
    const { t } = useTranslation();
    const { connections, accounts, transactions, addConnection } =
        useBankData();
    const [loading, setLoading] = useState(false);
    const [webViewUrl, setWebViewUrl] = useState(null);
    const [pendingConnectionId, setPendingConnectionId] = useState(null);

    useEffect(() => {
        loadAccounts();
    }, []);

    async function loadAccounts() {
        try {
            // TODO: Endpoint for listing user bank connections
        } catch (err) {
            console.error("Error loading accounts:", err);
        }
    }

    async function startBTConnection() {
        setLoading(true);
        try {
            const registerRes = await api.post("/bt/register-client");
            const { connectionId } = registerRes.data;

            const consentRes = await api.post("/bt/init-consent", {
                connectionId,
            });
            const { authUrl } = consentRes.data;

            setPendingConnectionId(connectionId);
            setWebViewUrl(authUrl);
        } catch (err) {
            console.error(
                "BT Connection error:",
                err.response?.data || err.message
            );
            Alert.alert(
                t("common.error"),
                err.response?.data?.error
                    ? t(getErrorKey(err.response.data.error, "accounts.connectionError"))
                    : t("accounts.connectionError")
            );
        } finally {
            setLoading(false);
        }
    }

    const codeProcessed = useRef(false);

    function handleWebViewNavigation(navState) {
        const { url } = navState;
        if (!url || codeProcessed.current) return;

        try {
            const urlObj = new URL(url);
            if (
                urlObj.hostname.endsWith("google.com") &&
                urlObj.searchParams.has("code")
            ) {
                const code = urlObj.searchParams.get("code");
                if (code && pendingConnectionId) {
                    codeProcessed.current = true;
                    setWebViewUrl(null);
                    exchangeToken(code, pendingConnectionId);
                }
            }
        } catch (e) {
            console.error("URL parse error:", e);
        }
    }

    async function exchangeToken(code, connectionId) {
        setLoading(true);
        try {
            await api.post("/bt/exchange-token", { connectionId, code });
            Alert.alert(t("common.success"), t("accounts.connectionSuccess"));
            await fetchBTAccounts(connectionId);
        } catch (err) {
            console.error(
                "Token exchange error:",
                err.response?.data || err.message
            );
            Alert.alert(t("common.error"), t("accounts.authError"));
        } finally {
            setLoading(false);
        }
    }

    async function fetchBTAccounts(connectionId) {
        try {
            await addConnection(connectionId);
        } catch (err) {
            console.error("Fetch accounts error:", err);
        }
    }

    // Get balance from account
    function getAccountBalance(account) {
        const availableBalance = account.balances?.find(
            (b) =>
                b.balanceType === "interimAvailable" ||
                b.balanceType === "expected"
        );
        const balance = availableBalance || account.balances?.[0];
        return {
            amount: balance?.balanceAmount?.amount || "—",
            currency:
                balance?.balanceAmount?.currency ||
                account.currency ||
                t("common.currency"),
        };
    }

    // Format IBAN with spaces
    function formatIban(iban) {
        if (!iban) return "";
        return iban.replace(/(.{4})/g, "$1 ").trim();
    }

    // Total across all accounts
    const totalBalance = accounts.reduce((sum, acc) => {
        const bal = getAccountBalance(acc);
        return sum + (parseFloat(bal.amount) || 0);
    }, 0);

    // Monthly stats for summary card
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyTx = transactions.filter((tx) => {
        const d = new Date(tx.bookingDate || tx.valueDate);
        return d >= monthStart && d <= now;
    });
    const monthlyIncome = monthlyTx
        .filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) > 0)
        .reduce((s, tx) => s + parseFloat(tx.transactionAmount?.amount || 0), 0);
    const monthlyExpenses = monthlyTx
        .filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0)
        .reduce((s, tx) => s + Math.abs(parseFloat(tx.transactionAmount?.amount || 0)), 0);

    return (
        <View className="flex-1 bg-dark-bg">
            {/* Header */}
            <View className="pt-14 pb-2 px-6">
                <Text className="text-white text-2xl font-bold">
                    {t("accounts.title")}
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                    {t("accounts.subtitle")}
                </Text>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 30 }}
            >
                {/* ===== MAIN BALANCE CARD ===== */}
                {accounts.length > 0 && (
                    <View className="mx-6 mt-4 rounded-3xl overflow-hidden">
                        <LinearGradient
                            colors={["#1E293B", "#0F172A"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                                padding: 24,
                                borderRadius: 24,
                                borderWidth: 1,
                                borderColor: "rgba(99,102,241,0.15)",
                            }}
                        >
                            {/* Decorative */}
                            <View
                                style={{
                                    position: "absolute",
                                    top: -25,
                                    right: -25,
                                    width: 100,
                                    height: 100,
                                    borderRadius: 50,
                                    backgroundColor: "rgba(99,102,241,0.08)",
                                }}
                            />
                            <View
                                style={{
                                    position: "absolute",
                                    bottom: -15,
                                    left: 30,
                                    width: 60,
                                    height: 60,
                                    borderRadius: 30,
                                    backgroundColor: "rgba(16,185,129,0.06)",
                                }}
                            />

                            {/* Bank logo + name */}
                            <View className="flex-row items-center mb-6">
                                <View className="w-10 h-10 rounded-xl bg-white/[0.08] items-center justify-center mr-3">
                                    <Ionicons
                                        name="business"
                                        size={18}
                                        color="#6366F1"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white font-semibold text-sm">
                                        Banca Transilvania
                                    </Text>
                                    <Text className="text-gray-500 text-xs mt-0.5">
                                        Open Banking
                                    </Text>
                                </View>
                                <View className="bg-success/[0.12] px-2.5 py-1 rounded-lg flex-row items-center">
                                    <View className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
                                    <Text className="text-success text-xs font-medium">
                                        {t("accounts.connected")}
                                    </Text>
                                </View>
                            </View>

                            {/* Total balance */}
                            <Text className="text-gray-400 text-xs uppercase tracking-wider">
                                {t("dashboard.totalBalance")}
                            </Text>
                            <Text className="text-white text-3xl font-extrabold mt-1">
                                {totalBalance.toLocaleString("ro-RO", {
                                    minimumFractionDigits: 2,
                                })}{" "}
                                <Text className="text-gray-500 text-base font-normal">
                                    {t("common.currency")}
                                </Text>
                            </Text>
                        </LinearGradient>
                    </View>
                )}

                {/* ===== INDIVIDUAL ACCOUNTS ===== */}
                {accounts.length > 0 && (
                    <View className="px-6 mt-6">
                        <SectionHeader
                            title={t("accounts.connectedAccounts")}
                        />
                        {accounts.map((account, index) => {
                            const bal = getAccountBalance(account);
                            return (
                                <View
                                    key={account.resourceId || index}
                                    className="bg-dark-surface rounded-2xl p-4 mb-2.5 border border-dark-border flex-row items-center"
                                >
                                    <View className="w-10 h-10 rounded-xl bg-accent/[0.1] items-center justify-center mr-3">
                                        <Ionicons
                                            name="wallet-outline"
                                            size={18}
                                            color="#6366F1"
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text
                                            className="text-white font-medium text-sm"
                                            numberOfLines={1}
                                        >
                                            {account.name ||
                                                account.iban ||
                                                "Cont BT"}
                                        </Text>
                                        <Text className="text-gray-600 text-xs mt-0.5">
                                            {formatIban(account.iban)}
                                        </Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-white font-bold text-base">
                                            {parseFloat(
                                                bal.amount
                                            ).toLocaleString("ro-RO", {
                                                minimumFractionDigits: 2,
                                            })}
                                        </Text>
                                        <Text className="text-gray-600 text-xs mt-0.5">
                                            {bal.currency}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* ===== MONTHLY SUMMARY CARD ===== */}
                {transactions.length > 0 && (
                    <View className="px-6 mt-6">
                        <SectionHeader
                            title={t("dashboard.thisMonth")}
                        />
                        <View className="bg-dark-surface rounded-2xl border border-dark-border p-4">
                            <View className="flex-row">
                                {/* Transactions count */}
                                <View className="flex-1 items-center py-2">
                                    <View className="w-9 h-9 rounded-xl bg-accent/[0.1] items-center justify-center mb-2">
                                        <Ionicons name="receipt-outline" size={16} color="#6366F1" />
                                    </View>
                                    <Text className="text-white font-bold text-lg">
                                        {monthlyTx.length}
                                    </Text>
                                    <Text className="text-gray-600 text-xs mt-0.5">
                                        {t("accounts.recentTransactions")}
                                    </Text>
                                </View>

                                {/* Divider */}
                                <View className="w-px bg-white/[0.06] my-2" />

                                {/* Income */}
                                <View className="flex-1 items-center py-2">
                                    <View className="w-9 h-9 rounded-xl bg-success/[0.1] items-center justify-center mb-2">
                                        <Ionicons name="trending-up" size={16} color="#22C55E" />
                                    </View>
                                    <Text className="text-success font-bold text-sm">
                                        +{monthlyIncome.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </Text>
                                    <Text className="text-gray-600 text-xs mt-0.5">
                                        {t("dashboard.income")}
                                    </Text>
                                </View>

                                {/* Divider */}
                                <View className="w-px bg-white/[0.06] my-2" />

                                {/* Expenses */}
                                <View className="flex-1 items-center py-2">
                                    <View className="w-9 h-9 rounded-xl bg-expense/[0.1] items-center justify-center mb-2">
                                        <Ionicons name="trending-down" size={16} color="#F43F5E" />
                                    </View>
                                    <Text className="text-expense font-bold text-sm">
                                        -{monthlyExpenses.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </Text>
                                    <Text className="text-gray-600 text-xs mt-0.5">
                                        {t("dashboard.expenses")}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* ===== CONNECT BUTTON ===== */}
                <View className="px-6 mt-6">
                    <Pressable
                        onPress={startBTConnection}
                        disabled={loading}
                        className="rounded-2xl overflow-hidden"
                        style={({ pressed }) => ({
                            opacity: pressed ? 0.8 : 1,
                        })}
                    >
                        <LinearGradient
                            colors={["rgba(16,185,129,0.08)", "rgba(99,102,241,0.06)"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                                padding: 24,
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: "rgba(16,185,129,0.15)",
                                borderStyle: "dashed",
                                alignItems: "center",
                            }}
                        >
                            {loading ? (
                                <ActivityIndicator
                                    color="#10B981"
                                    size="large"
                                />
                            ) : (
                                <>
                                    <View className="w-12 h-12 rounded-2xl bg-primary/[0.12] items-center justify-center mb-3">
                                        <Ionicons
                                            name="add"
                                            size={24}
                                            color="#10B981"
                                        />
                                    </View>
                                    <Text className="text-primary font-bold text-sm">
                                        {t("accounts.connectBT")}
                                    </Text>
                                    <Text className="text-gray-600 text-xs mt-1">
                                        {t("accounts.openBanking")}
                                    </Text>
                                </>
                            )}
                        </LinearGradient>
                    </Pressable>
                </View>
            </ScrollView>

            {/* ===== BT Auth WebView Modal ===== */}
            <Modal
                visible={!!webViewUrl}
                animationType="slide"
                onRequestClose={() => setWebViewUrl(null)}
            >
                <View className="flex-1 bg-dark-bg">
                    <LinearGradient
                        colors={["#161621", "#0C0C14"]}
                        style={{
                            paddingTop: 56,
                            paddingBottom: 12,
                            paddingHorizontal: 16,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <Pressable onPress={() => setWebViewUrl(null)}>
                            <Ionicons name="close" size={26} color="#fff" />
                        </Pressable>
                        <Text className="text-white font-semibold text-base">
                            {t("accounts.btAuth")}
                        </Text>
                        <View className="w-7" />
                    </LinearGradient>

                    {webViewUrl && (
                        <WebView
                            source={{ uri: webViewUrl }}
                            onNavigationStateChange={handleWebViewNavigation}
                            startInLoadingState
                            renderLoading={() => (
                                <View className="flex-1 items-center justify-center bg-dark-bg">
                                    <ActivityIndicator
                                        size="large"
                                        color="#10B981"
                                    />
                                    <Text className="text-gray-400 mt-4">
                                        {t("accounts.loadingBT")}
                                    </Text>
                                </View>
                            )}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}
