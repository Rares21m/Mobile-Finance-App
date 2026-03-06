import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { WebView } from "react-native-webview";

import SectionHeader from "../../components/SectionHeader";
import { useBankData } from "../../context/BankContext";
import api from "../../services/api";
import { getErrorKey } from "../../utils/errorCodes";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH - 56;
const CARD_GAP = 12;

const BANK_CONFIG = {
  BT: {
    label: "Banca Transilvania",
    color: "#00A693",
    bgColor: "rgba(0,166,147,0.12)",
    cardGradient: ["#003D39", "#006B5F"],
    logo: require("../../assets/images/BTlogo.png"),
    initials: "BT",
  },
  BRD: {
    label: "BRD",
    color: "#E3000F",
    bgColor: "rgba(227,0,15,0.10)",
    cardGradient: ["#660007", "#A8000C"],
    logo: require("../../assets/images/BRDlogo.png"),
    initials: "BRD",
  },
};
const BANKS = ["BT", "BRD"];

export default function Accounts() {
  const { isDark, theme } = useTheme();
  const c = theme.colors;
  const { t } = useTranslation();
  const {
    connections,
    accounts,
    transactions,
    addConnection,
    removeConnection,
    sessionExpired,
  } = useBankData();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState(null);
  const [pendingConnectionId, setPendingConnectionId] = useState(null);
  const [pendingBank, setPendingBank] = useState("BT");
  const [disconnectConfirm, setDisconnectConfirm] = useState(null); // "BT" | "BRD" | null
  const [disconnecting, setDisconnecting] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

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
      console.error("BT Connection error:", err.response?.data || err.message);
      showToast(
        err.response?.data?.error
          ? t(getErrorKey(err.response.data.error, "accounts.connectionError"))
          : t("accounts.connectionError"),
        "error",
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
      console.error("BRD Connection error:", err.response?.data || err.message);
      showToast(
        err.response?.data?.error
          ? t(getErrorKey(err.response.data.error, "accounts.connectionError"))
          : t("accounts.connectionError"),
        "error",
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
      const endpoint =
        bankName === "BRD" ? "/brd/exchange-token" : "/bt/exchange-token";
      await api.post(endpoint, { connectionId, code, state: connectionId });
      showToast(t("accounts.connectionSuccess"), "success");
      await fetchAccounts(connectionId, bankName);
    } catch (err) {
      console.error("Token exchange error:", err.response?.data || err.message);
      showToast(t("accounts.authError"), "error");
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

  async function handleDisconnect(bankName) {
    setDisconnecting(true);
    try {
      await removeConnection(bankName);
      setDisconnectConfirm(null);
      showToast(t("accounts.disconnectSuccess", { bank: bankName }), "success");
    } catch (err) {
      console.error("Disconnect error:", err.response?.data || err.message);
      showToast(t("accounts.disconnectError"), "error");
    } finally {
      setDisconnecting(false);
    }
  }

  // Get balance from account
  function getAccountBalance(account) {
    const availableBalance = account.balances?.find(
      (b) =>
        b.balanceType === "interimAvailable" || b.balanceType === "expected",
    );
    const balance = availableBalance || account.balances?.[0];
    return {
      amount: balance?.balanceAmount?.amount || "â€”",
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
    .reduce(
      (s, tx) => s + Math.abs(parseFloat(tx.transactionAmount?.amount || 0)),
      0,
    );

  return (
    <View className="flex-1 bg-background pt-14">
      {/* ===== SESSION EXPIRED BANNER ===== */}
      {sessionExpired && (
        <View
          style={{
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
          }}
        >
          <Ionicons name="warning-outline" size={18} color="#F43F5E" />
          <Text style={{ color: "#F43F5E", fontSize: 13, flex: 1 }}>
            {t("accounts.sessionExpired")}
          </Text>
        </View>
      )}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ===== PAGE HEADER removed per UX request ===== */}

        {/* ===== SWIPE BANK CARDS ===== */}
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={{
              paddingLeft: 24,
              paddingRight: 24,
              gap: CARD_GAP,
            }}
            onScroll={(e) => {
              const idx = Math.round(
                e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP),
              );
              setActiveCardIndex(idx);
            }}
            scrollEventThrottle={16}
          >
            {BANKS.map((bankKey) => {
              const cfg = BANK_CONFIG[bankKey];
              const isConnected = connections.some(
                (conn) => conn.bankName === bankKey && conn.status === "active",
              );
              const bankConnectionIds = connections
                .filter(
                  (conn) =>
                    conn.bankName === bankKey && conn.status === "active",
                )
                .map((conn) => conn.id);
              const bankAccounts = accounts.filter((acc) =>
                bankConnectionIds.includes(acc.connectionId),
              );
              const bankTotal = bankAccounts.reduce((sum, acc) => {
                const bal = getAccountBalance(acc);
                return sum + (parseFloat(bal.amount) || 0);
              }, 0);
              const isCardLoading = loading && pendingBank === bankKey;

              return (
                <Pressable
                  key={bankKey}
                  onPress={
                    !isConnected && !isCardLoading
                      ? bankKey === "BT"
                        ? startBTConnection
                        : startBRDConnection
                      : undefined
                  }
                  style={({ pressed }) => ({
                    opacity: pressed && !isConnected ? 0.92 : 1,
                  })}
                >
                  <LinearGradient
                    colors={cfg.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: CARD_WIDTH,
                      height: 200,
                      borderRadius: 24,
                      padding: 22,
                      overflow: "hidden",
                    }}
                  >
                    {/* Background watermark logo */}
                    <Image
                      source={cfg.logo}
                      style={{
                        position: "absolute",
                        right: -28,
                        bottom: -28,
                        width: 190,
                        height: 190,
                        opacity: 0.07,
                      }}
                      resizeMode="contain"
                    />

                    {/* Top row: logo pill + status badge */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: "rgba(255,255,255,0.93)",
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Image
                          source={cfg.logo}
                          style={{ width: 82, height: 26 }}
                          resizeMode="contain"
                        />
                      </View>
                      <View
                        style={{
                          backgroundColor: isConnected
                            ? "rgba(34,197,94,0.22)"
                            : "rgba(255,255,255,0.15)",
                          borderRadius: 20,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: isConnected
                              ? "#22C55E"
                              : "rgba(255,255,255,0.45)",
                          }}
                        />
                        <Text
                          style={{
                            color: isConnected
                              ? "#22C55E"
                              : "rgba(255,255,255,0.7)",
                            fontSize: 11,
                            fontWeight: "600",
                          }}
                        >
                          {isConnected
                            ? t("accounts.connected")
                            : t("accounts.notConnected")}
                        </Text>
                      </View>
                    </View>

                    {/* Bottom content */}
                    <View style={{ flex: 1, justifyContent: "flex-end" }}>
                      {isConnected ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "flex-end",
                            justifyContent: "space-between",
                          }}
                        >
                          <View>
                            <Text
                              style={{
                                color: "rgba(255,255,255,0.55)",
                                fontSize: 12,
                                marginBottom: 5,
                              }}
                            >
                              {bankAccounts.length}{" "}
                              {t("dashboard.accounts").toLowerCase()}
                            </Text>
                            <Text
                              style={{
                                color: "#fff",
                                fontSize: 26,
                                fontWeight: "800",
                                letterSpacing: -0.5,
                              }}
                            >
                              {bankTotal.toLocaleString("ro-RO", {
                                minimumFractionDigits: 2,
                              })}
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: "400",
                                  color: "rgba(255,255,255,0.65)",
                                }}
                              >
                                {" "}
                                RON
                              </Text>
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => setDisconnectConfirm(bankKey)}
                            style={({ pressed }) => ({
                              backgroundColor: "rgba(244,63,94,0.2)",
                              borderRadius: 10,
                              padding: 9,
                              opacity: pressed ? 0.7 : 1,
                            })}
                          >
                            <Ionicons
                              name="unlink-outline"
                              size={16}
                              color="#F43F5E"
                            />
                          </Pressable>
                        </View>
                      ) : (
                        <View>
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.5)",
                              fontSize: 11,
                              marginBottom: 10,
                            }}
                          >
                            {t("accounts.openBanking")}
                          </Text>
                          {isCardLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <View
                              style={{
                                backgroundColor: "rgba(255,255,255,0.18)",
                                borderRadius: 12,
                                paddingVertical: 10,
                                paddingHorizontal: 16,
                                flexDirection: "row",
                                alignItems: "center",
                                alignSelf: "flex-start",
                                gap: 8,
                              }}
                            >
                              <Text
                                style={{
                                  color: "#fff",
                                  fontSize: 13,
                                  fontWeight: "700",
                                }}
                              >
                                {t("accounts.connectNow")}
                              </Text>
                              <Ionicons
                                name="arrow-forward"
                                size={13}
                                color="#fff"
                              />
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Dot indicators */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
              marginTop: 14,
            }}
          >
            {BANKS.map((_, i) => (
              <View
                key={i}
                style={{
                  width: activeCardIndex === i ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: activeCardIndex === i ? c.primary : c.border,
                }}
              />
            ))}
          </View>
        </View>

        {/* ===== PORTFOLIO TOTAL CARD ===== */}
        {accounts.length > 0 &&
          (() => {
            const connectedBankNames = [
              ...new Set(
                connections
                  .filter((conn) => conn.status === "active")
                  .map((conn) => conn.bankName),
              ),
            ];
            return (
              <View style={{ marginHorizontal: 24, marginTop: 20 }}>
                <LinearGradient
                  colors={
                    isDark ? ["#1A2F2B", "#1D2940"] : ["#E6F5F1", "#EEF0FA"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 24,
                    padding: 22,
                    borderWidth: 1,
                    borderColor: c.primary + "28",
                  }}
                >
                  {/* Label row */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 6,
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: c.primary + "20",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name="stats-chart"
                        size={13}
                        color={c.primary}
                      />
                    </View>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontSize: 11,
                        fontWeight: "600",
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                      }}
                    >
                      {t("accounts.totalPortfolio")}
                    </Text>
                  </View>

                  {/* Big balance */}
                  <Text
                    style={{
                      color: c.foreground,
                      fontSize: 38,
                      fontWeight: "900",
                      letterSpacing: -1.5,
                      lineHeight: 44,
                    }}
                  >
                    {totalBalance.toLocaleString("ro-RO", {
                      minimumFractionDigits: 2,
                    })}
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "500",
                        color: c.textMuted,
                        letterSpacing: 0,
                      }}
                    >
                      {" "}
                      {t("common.currency")}
                    </Text>
                  </Text>

                  {/* Separator */}
                  <View
                    style={{
                      height: 1,
                      backgroundColor: c.border,
                      marginVertical: 14,
                      opacity: 0.6,
                    }}
                  />

                  {/* Per-bank chips */}
                  <View
                    style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}
                  >
                    {connectedBankNames.map((bankName) => {
                      const cfg = BANK_CONFIG[bankName];
                      const bankConnectionIds = connections
                        .filter(
                          (conn) =>
                            conn.bankName === bankName &&
                            conn.status === "active",
                        )
                        .map((conn) => conn.id);
                      const bankTotal = accounts
                        .filter((acc) =>
                          bankConnectionIds.includes(acc.connectionId),
                        )
                        .reduce((sum, acc) => {
                          const bal = getAccountBalance(acc);
                          return sum + (parseFloat(bal.amount) || 0);
                        }, 0);
                      const pct =
                        totalBalance > 0
                          ? Math.round((bankTotal / totalBalance) * 100)
                          : 0;
                      const chipColor = cfg?.color || c.accent;
                      return (
                        <View
                          key={bankName}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: chipColor + "16",
                            borderRadius: 10,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            gap: 6,
                            borderWidth: 1,
                            borderColor: chipColor + "28",
                          }}
                        >
                          <View
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: 3.5,
                              backgroundColor: chipColor,
                            }}
                          />
                          <Text
                            style={{
                              color: chipColor,
                              fontSize: 11,
                              fontWeight: "700",
                            }}
                          >
                            {bankName}
                          </Text>
                          <Text style={{ color: c.textMuted, fontSize: 11 }}>
                            {bankTotal.toLocaleString("ro-RO", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}{" "}
                            RON
                          </Text>
                          <View
                            style={{
                              backgroundColor: chipColor + "22",
                              borderRadius: 4,
                              paddingHorizontal: 4,
                              paddingVertical: 1,
                            }}
                          >
                            <Text
                              style={{
                                color: chipColor,
                                fontSize: 9,
                                fontWeight: "700",
                              }}
                            >
                              {pct}%
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </LinearGradient>
              </View>
            );
          })()}

        {/* ===== GROUPED BY BANK SECTIONS ===== */}
        {accounts.length > 0 &&
          (() => {
            const activeConnections = connections.filter(
              (conn) => conn.status === "active",
            );
            const bankNames = [
              ...new Set(activeConnections.map((conn) => conn.bankName)),
            ];

            return (
              <View className="px-6 mt-6">
                <SectionHeader title={t("accounts.connectedAccounts")} />
                {bankNames.map((bankName) => {
                  const cfg = BANK_CONFIG[bankName] || {
                    label: bankName,
                    color: c.accent,
                    bgColor: "rgba(99,102,241,0.12)",
                    initials: bankName.slice(0, 3),
                  };
                  const bankConnectionIds = activeConnections
                    .filter((conn) => conn.bankName === bankName)
                    .map((conn) => conn.id);
                  const bankAccounts = accounts.filter((acc) =>
                    bankConnectionIds.includes(acc.connectionId),
                  );
                  const bankTotal = bankAccounts.reduce((sum, acc) => {
                    const bal = getAccountBalance(acc);
                    return sum + (parseFloat(bal.amount) || 0);
                  }, 0);

                  return (
                    <View key={bankName} style={{ marginBottom: 20 }}>
                      {/* Minimal bank label */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 7,
                          marginBottom: 8,
                        }}
                      >
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: cfg.color,
                          }}
                        />
                        <Text
                          style={{
                            color: cfg.color,
                            fontSize: 11,
                            fontWeight: "700",
                            letterSpacing: 0.4,
                            textTransform: "uppercase",
                          }}
                        >
                          {cfg.label}
                        </Text>
                        <View
                          style={{
                            flex: 1,
                            height: 1,
                            backgroundColor: cfg.color + "25",
                            marginLeft: 4,
                          }}
                        />
                        <Text
                          style={{
                            color: c.textMuted,
                            fontSize: 11,
                          }}
                        >
                          {bankAccounts.length}{" "}
                          {t("dashboard.accounts").toLowerCase()}
                        </Text>
                      </View>

                      {/* Accounts list for this bank */}
                      <View style={{ gap: 6 }}>
                        {bankAccounts.map((account, index) => {
                          const bal = getAccountBalance(account);
                          const amount = parseFloat(bal.amount) || 0;
                          const contribution =
                            bankTotal > 0 ? amount / bankTotal : 0;
                          const rawType =
                            account.cashAccountType || account.usage || null;
                          const typeMap = {
                            CACC: "CURENT",
                            SVGS: "ECONOMII",
                            TRAN: "PLĂȚI",
                            LOAN: "CREDIT",
                            MOMA: "MONEDĂ",
                          };
                          const accountTypeLabel = rawType
                            ? typeMap[rawType] || rawType.slice(0, 5)
                            : null;
                          return (
                            <View
                              key={`${account.connectionId || ""}-${account.resourceId || index}`}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                paddingRight: 14,
                                paddingVertical: 12,
                                borderRadius: 12,
                                backgroundColor: c.card,
                                overflow: "hidden",
                              }}
                            >
                              {/* Left accent bar */}
                              <View
                                style={{
                                  width: 3,
                                  alignSelf: "stretch",
                                  backgroundColor: cfg.color,
                                  borderRadius: 2,
                                  marginRight: 12,
                                  opacity: 0.75,
                                }}
                              />
                              <View
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 9,
                                  backgroundColor: cfg.bgColor,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  marginRight: 12,
                                }}
                              >
                                <Ionicons
                                  name="wallet-outline"
                                  size={16}
                                  color={cfg.color}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 6,
                                    marginBottom: 2,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: c.foreground,
                                      fontWeight: "600",
                                      fontSize: 13,
                                      flexShrink: 1,
                                    }}
                                    numberOfLines={1}
                                  >
                                    {account.name ||
                                      account.iban ||
                                      `Cont ${bankName}`}
                                  </Text>
                                  {accountTypeLabel && (
                                    <View
                                      style={{
                                        backgroundColor: cfg.color + "18",
                                        borderRadius: 4,
                                        paddingHorizontal: 5,
                                        paddingVertical: 2,
                                      }}
                                    >
                                      <Text
                                        style={{
                                          color: cfg.color,
                                          fontSize: 9,
                                          fontWeight: "700",
                                          letterSpacing: 0.3,
                                        }}
                                      >
                                        {accountTypeLabel}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <Text
                                  style={{
                                    color: c.textMuted,
                                    fontSize: 11,
                                    marginBottom: 6,
                                  }}
                                >
                                  {formatIban(account.iban)}
                                </Text>
                                {/* Contribution progress bar */}
                                <View
                                  style={{
                                    height: 2,
                                    backgroundColor: c.border,
                                    borderRadius: 1,
                                  }}
                                >
                                  <View
                                    style={{
                                      width: `${Math.round(contribution * 100)}%`,
                                      height: 2,
                                      backgroundColor: cfg.color,
                                      borderRadius: 1,
                                      opacity: 0.65,
                                    }}
                                  />
                                </View>
                              </View>
                              <View
                                style={{
                                  alignItems: "flex-end",
                                  marginLeft: 10,
                                }}
                              >
                                <Text
                                  style={{
                                    color: c.foreground,
                                    fontWeight: "700",
                                    fontSize: 15,
                                  }}
                                >
                                  {amount.toLocaleString("ro-RO", {
                                    minimumFractionDigits: 2,
                                  })}
                                </Text>
                                <Text
                                  style={{
                                    color: c.textMuted,
                                    fontSize: 11,
                                    marginTop: 2,
                                  }}
                                >
                                  {bal.currency}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })()}

        {/* ===== MONTHLY SUMMARY CARD ===== */}
        {transactions.length > 0 && (
          <View style={{ paddingHorizontal: 24, marginTop: 28 }}>
            <SectionHeader title={t("dashboard.thisMonth")} />
            <View
              style={{
                backgroundColor: c.card,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: c.border,
                overflow: "hidden",
              }}
            >
              {/* Header: transaction count badge */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingTop: 14,
                  paddingBottom: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                }}
              >
                <Text
                  style={{
                    color: c.textMuted,
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  {t("accounts.recentTransactions")}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    backgroundColor: c.accent + "18",
                    borderRadius: 8,
                    paddingHorizontal: 9,
                    paddingVertical: 5,
                  }}
                >
                  <Ionicons name="receipt-outline" size={12} color={c.accent} />
                  <Text
                    style={{
                      color: c.accent,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    {monthlyTx.length}
                  </Text>
                </View>
              </View>

              {/* Income / Expense boxes */}
              <View style={{ flexDirection: "row", padding: 12, gap: 10 }}>
                {/* Income box */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(34,197,94,0.08)",
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: "rgba(34,197,94,0.18)",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: "rgba(34,197,94,0.18)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="arrow-down" size={12} color="#22C55E" />
                    </View>
                    <Text
                      style={{
                        color: "#22C55E",
                        fontSize: 11,
                        fontWeight: "600",
                      }}
                    >
                      {t("dashboard.income")}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: "#22C55E",
                      fontSize: 20,
                      fontWeight: "800",
                      letterSpacing: -0.5,
                    }}
                  >
                    +
                    {monthlyIncome.toLocaleString("ro-RO", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </Text>
                  <Text
                    style={{
                      color: "rgba(34,197,94,0.55)",
                      fontSize: 10,
                      marginTop: 2,
                    }}
                  >
                    RON
                  </Text>
                </View>

                {/* Expense box */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(244,63,94,0.08)",
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: "rgba(244,63,94,0.18)",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: "rgba(244,63,94,0.18)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="arrow-up" size={12} color="#F43F5E" />
                    </View>
                    <Text
                      style={{
                        color: "#F43F5E",
                        fontSize: 11,
                        fontWeight: "600",
                      }}
                    >
                      {t("dashboard.expenses")}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: "#F43F5E",
                      fontSize: 20,
                      fontWeight: "800",
                      letterSpacing: -0.5,
                    }}
                  >
                    -
                    {monthlyExpenses.toLocaleString("ro-RO", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </Text>
                  <Text
                    style={{
                      color: "rgba(244,63,94,0.55)",
                      fontSize: 10,
                      marginTop: 2,
                    }}
                  >
                    RON
                  </Text>
                </View>
              </View>

              {/* Net flow bar */}
              {(() => {
                const net = monthlyIncome - monthlyExpenses;
                const isPositive = net >= 0;
                const total = monthlyIncome + monthlyExpenses;
                const incomeRatio = total > 0 ? monthlyIncome / total : 0.5;
                return (
                  <View style={{ marginHorizontal: 14, marginBottom: 16 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 7,
                      }}
                    >
                      <Text style={{ color: c.textMuted, fontSize: 11 }}>
                        Net flow
                      </Text>
                      <Text
                        style={{
                          color: isPositive ? "#22C55E" : "#F43F5E",
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        {isPositive ? "+" : ""}
                        {net.toLocaleString("ro-RO", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}{" "}
                        RON
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 5,
                        backgroundColor: "rgba(244,63,94,0.25)",
                        borderRadius: 4,
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.round(incomeRatio * 100)}%`,
                          height: 5,
                          backgroundColor: "#22C55E",
                          borderRadius: 4,
                        }}
                      />
                    </View>
                  </View>
                );
              })()}
            </View>
          </View>
        )}

        {/* ===== BENEFITS SECTION (when no banks connected) ===== */}
        {accounts.length === 0 && (
          <View style={{ paddingTop: 32, paddingBottom: 8 }}>
            <View style={{ paddingHorizontal: 24 }}>
              <SectionHeader title={t("accounts.whyConnect")} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 24,
                gap: 12,
                paddingBottom: 4,
              }}
            >
              {[
                {
                  icon: "card-outline",
                  titleKey: "accounts.benefitBalances",
                  descKey: "accounts.benefitBalancesDesc",
                  color: c.primary,
                  gradientColors: isDark
                    ? [c.primary + "28", c.primary + "08"]
                    : [c.primary + "20", c.primary + "06"],
                },
                {
                  icon: "swap-horizontal-outline",
                  titleKey: "accounts.benefitTransactions",
                  descKey: "accounts.benefitTransactionsDesc",
                  color: "#8B5CF6",
                  gradientColors: isDark
                    ? ["rgba(139,92,246,0.22)", "rgba(139,92,246,0.06)"]
                    : ["rgba(139,92,246,0.16)", "rgba(139,92,246,0.04)"],
                },
                {
                  icon: "analytics-outline",
                  titleKey: "accounts.benefitInsights",
                  descKey: "accounts.benefitInsightsDesc",
                  color: "#F59E0B",
                  gradientColors: isDark
                    ? ["rgba(245,158,11,0.22)", "rgba(245,158,11,0.06)"]
                    : ["rgba(245,158,11,0.16)", "rgba(245,158,11,0.04)"],
                },
              ].map((item) => (
                <LinearGradient
                  key={item.icon}
                  colors={item.gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    width: 158,
                    borderRadius: 20,
                    padding: 18,
                    borderWidth: 1,
                    borderColor: item.color + "28",
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: item.color + "1A",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                    }}
                  >
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <Text
                    style={{
                      color: c.foreground,
                      fontWeight: "700",
                      fontSize: 13,
                      lineHeight: 18,
                      marginBottom: 6,
                    }}
                  >
                    {t(item.titleKey)}
                  </Text>
                  <Text
                    style={{
                      color: c.textMuted,
                      fontSize: 11,
                      lineHeight: 16,
                    }}
                  >
                    {t(item.descKey)}
                  </Text>
                </LinearGradient>
              ))}
            </ScrollView>

            {/* Security badge */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 20,
                gap: 6,
              }}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={c.textMuted}
              />
              <Text style={{ color: c.textMuted, fontSize: 12 }}>
                {t("accounts.psd2Security")}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ===== DISCONNECT CONFIRMATION MODAL ===== */}
      <Modal
        visible={!!disconnectConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => !disconnecting && setDisconnectConfirm(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 32,
          }}
        >
          <View
            style={{
              backgroundColor: c.card,
              borderRadius: 20,
              padding: 24,
              width: "100%",
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "rgba(244,63,94,0.12)",
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="unlink-outline" size={24} color="#F43F5E" />
            </View>
            <Text
              style={{
                color: c.foreground,
                fontSize: 17,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {t("accounts.disconnectTitle", { bank: disconnectConfirm })}
            </Text>
            <Text
              style={{
                color: c.textMuted,
                fontSize: 13,
                textAlign: "center",
                lineHeight: 20,
                marginBottom: 24,
              }}
            >
              {t("accounts.disconnectDesc")}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setDisconnectConfirm(null)}
                disabled={disconnecting}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 12,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.border,
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    color: c.foreground,
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  {t("common.cancel")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleDisconnect(disconnectConfirm)}
                disabled={disconnecting}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 12,
                  backgroundColor: "rgba(244,63,94,0.15)",
                  borderWidth: 1,
                  borderColor: "rgba(244,63,94,0.35)",
                  alignItems: "center",
                  opacity: pressed || disconnecting ? 0.7 : 1,
                })}
              >
                {disconnecting ? (
                  <ActivityIndicator size="small" color="#F43F5E" />
                ) : (
                  <Text
                    style={{
                      color: "#F43F5E",
                      fontWeight: "700",
                      fontSize: 14,
                    }}
                  >
                    {t("accounts.disconnectConfirm")}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== Bank Auth WebView Modal ===== */}
      <Modal
        visible={!!webViewUrl}
        animationType="slide"
        onRequestClose={() => {
          setWebViewUrl(null);
          codeProcessed.current = false;
        }}
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
            <Pressable
              onPress={() => {
                setWebViewUrl(null);
                codeProcessed.current = false;
              }}
            >
              <Ionicons name="close" size={26} color={c.webViewIconColor} />
            </Pressable>
            <Text className="text-foreground font-semibold text-base">
              {pendingBank === "BRD"
                ? "Autentificare BRD"
                : t("accounts.btAuth")}
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
                  <ActivityIndicator size="large" color="#10B981" />
                  <Text className="text-text-muted mt-4">
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
