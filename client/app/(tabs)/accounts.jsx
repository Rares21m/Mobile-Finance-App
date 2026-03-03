import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
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
    const { isDark, theme } = useTheme();
    const c = theme.colors;
    const { t } = useTranslation();
    const { connections, accounts, transactions, addConnection, sessionExpired } =
        useBankData();
    const [loading, setLoading] = useState(false);
    const [webViewUrl, setWebViewUrl] = useState(null);
    const [pendingConnectionId, setPendingConnectionId] = useState(null);
    const [pendingBank, setPendingBank] = useState("BT");

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

    const codeProcessed = useRef(false);

    async function startBTConnection() {
        setLoading(true);
        codeProcessed.current = false;
        try {
            const registerRes = await api.post("/bt/register-client");
            const { connectionId } = registerRes.data;

            const consentRes = await api.post("/bt/init-consent", {
                connectionId,
            });
            const { authUrl } = consentRes.data;

            setPendingBank("BT");
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

    async function startBRDConnection() {
        setLoading(true);
        try {
            const consentRes = await api.post("/brd/init-consent");
            const { authUrl } = consentRes.data;

            // The state param in the authUrl is the connectionId
            const stateParam = new URL(authUrl).searchParams.get("state");

            setPendingBank("BRD");
            setPendingConnectionId(stateParam);
            codeProcessed.current = false;
            setWebViewUrl(authUrl);
        } catch (err) {
            console.error(
                "BRD Connection error:",
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
                    exchangeToken(code, pendingConnectionId, pendingBank);
                }
            }
        } catch (e) {
            console.error("URL parse error:", e);
        }
    }

    async function exchangeToken(code, connectionId, bankName = "BT") {
        setLoading(true);
        try {
            const endpoint = bankName === "BRD" ? "/brd/exchange-token" : "/bt/exchange-token";
            await api.post(endpoint, { connectionId, code, state: connectionId });
            Alert.alert(t("common.success"), t("accounts.connectionSuccess"));
            await fetchAccounts(connectionId, bankName);
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

    async function fetchAccounts(connectionId, bankName = "BT") {
        try {
            await addConnection(connectionId, bankName);
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
        <View className="flex-1 bg-background">
            {/* Header */}
            <View className="pt-14 pb-2 px-6">
                <Text className="text-foreground text-2xl font-bold">
                    {t("accounts.title")}
                </Text>
                <Text className="text-text-muted text-sm mt-1">
                    {t("accounts.subtitle")}
                </Text>
            </View>

            {/* ===== SESSION EXPIRED BANNER ===== */}
            {sessionExpired && (
                <View style={{
                    marginHorizontal: 24,
                    marginTop: 8,
                    backgroundColor: "rgba(244,63,94,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(244,63,94,0.3)",
                    borderRadius: 12,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                }}>
                    <Ionicons name="warning-outline" size={18} color="#F43F5E" />
                    <Text style={{ color: "#F43F5E", fontSize: 13, flex: 1 }}>
                        {t("accounts.sessionExpired")}
                    </Text>
                </View>
            )}

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 30 }}
            >
                {/* ===== MAIN BALANCE CARD ===== */}
                {accounts.length > 0 && (
                    <View className="mx-6 mt-4 rounded-3xl overflow-hidden">
                        <LinearGradient
                            colors={c.balanceCardGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                                padding: 24,
                                borderRadius: 24,
                                borderWidth: 1,
                                borderColor: c.balanceCardBorder,
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
                                <View className="w-10 h-10 rounded-xl bg-card items-center justify-center mr-3">
                                    <Ionicons
                                        name="business"
                                        size={18}
                                        color="#6366F1"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-foreground font-semibold text-sm">
                                        Banca Transilvania
                                    </Text>
                                    <Text className="text-text-muted text-xs mt-0.5">
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
                            <Text className="text-text-muted text-xs uppercase tracking-wider">
                                {t("dashboard.totalBalance")}
                            </Text>
                            <Text className="text-foreground text-3xl font-extrabold mt-1">
                                {totalBalance.toLocaleString("ro-RO", {
                                    minimumFractionDigits: 2,
                                })}{" "}
                                <Text className="text-text-muted text-base font-normal">
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
                                    key={`${account.connectionId || ''}-${account.resourceId || index}`}
                                    className="bg-surface rounded-2xl p-4 mb-2.5 border border-border flex-row items-center"
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
                                            className="text-foreground font-medium text-sm"
                                            numberOfLines={1}
                                        >
                                            {account.name ||
                                                account.iban ||
                                                "Cont BT"}
                                        </Text>
                                        <Text className="text-text-muted text-xs mt-0.5">
                                            {formatIban(account.iban)}
                                        </Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-foreground font-bold text-base">
                                            {parseFloat(
                                                bal.amount
                                            ).toLocaleString("ro-RO", {
                                                minimumFractionDigits: 2,
                                            })}
                                        </Text>
                                        <Text className="text-text-muted text-xs mt-0.5">
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
                        <View className="bg-surface rounded-2xl border border-border p-4">
                            <View className="flex-row">
                                {/* Transactions count */}
                                <View className="flex-1 items-center py-2">
                                    <View className="w-9 h-9 rounded-xl bg-accent/[0.1] items-center justify-center mb-2">
                                        <Ionicons name="receipt-outline" size={16} color="#6366F1" />
                                    </View>
                                    <Text className="text-foreground font-bold text-lg">
                                        {monthlyTx.length}
                                    </Text>
                                    <Text className="text-text-muted text-xs mt-0.5">
                                        {t("accounts.recentTransactions")}
                                    </Text>
                                </View>

                                {/* Divider */}
                                <View className="w-px bg-border my-2" />

                                {/* Income */}
                                <View className="flex-1 items-center py-2">
                                    <View className="w-9 h-9 rounded-xl bg-success/[0.1] items-center justify-center mb-2">
                                        <Ionicons name="trending-up" size={16} color="#22C55E" />
                                    </View>
                                    <Text className="text-success font-bold text-sm">
                                        +{monthlyIncome.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </Text>
                                    <Text className="text-text-muted text-xs mt-0.5">
                                        {t("dashboard.income")}
                                    </Text>
                                </View>

                                {/* Divider */}
                                <View className="w-px bg-border my-2" />

                                {/* Expenses */}
                                <View className="flex-1 items-center py-2">
                                    <View className="w-9 h-9 rounded-xl bg-expense/[0.1] items-center justify-center mb-2">
                                        <Ionicons name="trending-down" size={16} color="#F43F5E" />
                                    </View>
                                    <Text className="text-expense font-bold text-sm">
                                        -{monthlyExpenses.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </Text>
                                    <Text className="text-text-muted text-xs mt-0.5">
                                        {t("dashboard.expenses")}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* ===== CONNECT BUTTONS ===== */}
                {(() => {
                    const isBTConnected = connections.some(c => c.bankName === 'BT' && c.status === 'active');
                    const isBRDConnected = connections.some(c => c.bankName === 'BRD' && c.status === 'active');

                    const renderButton = ({ onPress, isConnected, isLoading, bankLabel, accentColor, bgClass }) => (
                        <Pressable
                            onPress={onPress}
                            disabled={loading}
                            className="rounded-2xl overflow-hidden"
                            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                        >
                            <LinearGradient
                                colors={c.connectButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{
                                    padding: 20,
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: isConnected ? accentColor + '40' : c.connectButtonBorder,
                                    borderStyle: isConnected ? "solid" : "dashed",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 14,
                                }}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={accentColor} size="small" />
                                ) : (
                                    <View className={`w-10 h-10 rounded-xl ${bgClass} items-center justify-center`}>
                                        <Ionicons
                                            name={isConnected ? "checkmark" : "add"}
                                            size={20}
                                            color={accentColor}
                                        />
                                    </View>
                                )}
                                <View className="flex-1">
                                    <Text style={{ color: accentColor }} className="font-bold text-sm">
                                        {isConnected ? `${bankLabel} — Conectat` : `Conectează ${bankLabel}`}
                                    </Text>
                                    <Text className="text-text-muted text-xs mt-0.5">
                                        {isConnected ? "Apasă pentru a reconecta" : t("accounts.openBanking")}
                                    </Text>
                                </View>
                                {isConnected && (
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" }} />
                                )}
                            </LinearGradient>
                        </Pressable>
                    );

                    return (
                        <View className="px-6 mt-6 gap-3">
                            {renderButton({
                                onPress: startBTConnection,
                                isConnected: isBTConnected,
                                isLoading: loading && pendingBank === "BT",
                                bankLabel: "Banca Transilvania",
                                accentColor: "#10B981",
                                bgClass: "bg-primary/[0.12]",
                            })}
                            {renderButton({
                                onPress: startBRDConnection,
                                isConnected: isBRDConnected,
                                isLoading: loading && pendingBank === "BRD",
                                bankLabel: "BRD",
                                accentColor: "#6366F1",
                                bgClass: "bg-accent/[0.12]",
                            })}
                        </View>
                    );
                })()}
            </ScrollView>

            {/* ===== Bank Auth WebView Modal ===== */}
            <Modal
                visible={!!webViewUrl}
                animationType="slide"
                onRequestClose={() => { setWebViewUrl(null); codeProcessed.current = false; }}
            >
                <View className="flex-1 bg-background">
                    <LinearGradient
                        colors={c.headerGradient}
                        style={{
                            paddingTop: 56,
                            paddingBottom: 12,
                            paddingHorizontal: 16,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <Pressable onPress={() => { setWebViewUrl(null); codeProcessed.current = false; }}>
                            <Ionicons name="close" size={26} color={c.webViewIconColor} />
                        </Pressable>
                        <Text className="text-foreground font-semibold text-base">
                            {pendingBank === "BRD" ? "Autentificare BRD" : t("accounts.btAuth")}
                        </Text>
                        <View className="w-7" />
                    </LinearGradient>

                    {webViewUrl && (
                        <WebView
                            source={{ uri: webViewUrl }}
                            onNavigationStateChange={handleWebViewNavigation}
                            startInLoadingState
                            renderLoading={() => (
                                <View className="flex-1 items-center justify-center bg-background">
                                    <ActivityIndicator
                                        size="large"
                                        color="#10B981"
                                    />
                                    <Text className="text-text-muted mt-4">
                                        {t("accounts.loadingBT")}
                                    </Text>
                                </View>
                            )}
                        />
                    )}
                </View>
            </Modal>
        </View >
    );
}
