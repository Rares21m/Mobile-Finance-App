import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View } from
"react-native";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "react-i18next";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ConnectionStatusBanner from "../../components/accounts/ConnectionStatusBanner";
import SessionExpiredBanner from "../../components/accounts/SessionExpiredBanner";
import BankCardCarousel from "../../components/accounts/BankCardCarousel";
import PortfolioTotalCard from "../../components/accounts/PortfolioTotalCard";
import ConnectedAccountsList from "../../components/accounts/ConnectedAccountsList";
import BenefitSection from "../../components/accounts/BenefitSection";
import DisconnectConfirmationModal from "../../components/accounts/DisconnectConfirmationModal";
import { useAuth } from "../../context/AuthContext";
import { useBankData } from "../../context/BankContext";
import api from "../../services/api";
import { getErrorKey } from "../../utils/errorCodes";
import { WebView } from "react-native-webview";

const BANK_CONFIG = {
  BT: {
    label: "Banca Transilvania",
    color: "#00A693",
    bgColor: "rgba(0,166,147,0.12)",
    cardGradient: ["#003D39", "#006B5F"],
    logo: require("../../assets/images/BTlogo.png"),
    initials: "BT"
  },
  BRD: {
    label: "BRD",
    color: "#E3000F",
    bgColor: "rgba(227,0,15,0.10)",
    cardGradient: ["#660007", "#A8000C"],
    logo: require("../../assets/images/BRDlogo.png"),
    initials: "BRD"
  },
  DEMO_BANK: {
    label: "Demo Bank",
    color: "#6366F1",
    bgColor: "rgba(99,102,241,0.12)",
    cardGradient: ["#312E81", "#4F46E5"],
    logo: null,
    initials: "DB"
  }
};
const BANKS = ["BT", "BRD", "DEMO_BANK"];

export default function Accounts() {
  const { isDark, theme } = useTheme();
  const c = theme.colors;
  const { t } = useTranslation();
  const { token } = useAuth();
  const {
    connections,
    accounts,
    addConnection,
    removeConnection,
    sessionExpired,
    trustByConnection
  } = useBankData();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState(null);
  const [pendingConnectionId, setPendingConnectionId] = useState(null);
  const [pendingBank, setPendingBank] = useState("BT");
  const [disconnectConfirm, setDisconnectConfirm] = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const codeProcessed = useRef(false);

  async function startBTConnection() {
    setLoading(true);
    codeProcessed.current = false;
    try {
      const registerRes = await api.post("/bt/register-client");
      const { connectionId } = registerRes.data;

      const consentRes = await api.post("/bt/init-consent", {
        connectionId
      });
      const { authUrl } = consentRes.data;

      setPendingBank("BT");
      setPendingConnectionId(connectionId);
      setWebViewUrl(authUrl);
    } catch (err) {
      console.warn("BT Connection error:", JSON.stringify(err.response?.data || err.message));
      showToast(
        err.response?.data?.error ?
        t(getErrorKey(err.response.data.error, "accounts.connectionError")) :
        t("accounts.connectionError"),
        "error"
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


      const stateParam = new URL(authUrl).searchParams.get("state");

      setPendingBank("BRD");
      setPendingConnectionId(stateParam);
      codeProcessed.current = false;
      setWebViewUrl(authUrl);
    } catch (err) {
      console.warn("BRD Connection error:", JSON.stringify(err.response?.data || err.message));
      showToast(
        err.response?.data?.error ?
        t(getErrorKey(err.response.data.error, "accounts.connectionError")) :
        t("accounts.connectionError"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function startDemoBankConnection() {
    if (!token) {
      showToast(t("accounts.demoAuthRequired"), "error");
      return;
    }

    setLoading(true);
    setPendingBank("DEMO_BANK");
    try {
      const res = await api.post("/demo-bank/connect");
      const { connectionId } = res.data;
      showToast(t("accounts.demoConnectionSuccess"), "success");
      await fetchAccounts(connectionId, "DEMO_BANK");
    } catch (err) {
      console.warn("Demo Bank connection error:", JSON.stringify(err.response?.data || err.message));
      showToast(
        err.response?.data?.error ?
        t(getErrorKey(err.response.data.error, "accounts.connectionError")) :
        t("accounts.connectionError"),
        "error"
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
      urlObj.searchParams.has("error"))
      {
        codeProcessed.current = true;
        setWebViewUrl(null);
        console.warn("BT authorization returned error:", urlObj.searchParams.get("error"));
        showToast(t("accounts.authError"), "error");
        return;
      }

      if (
      urlObj.hostname.endsWith("google.com") &&
      urlObj.searchParams.has("code"))
      {
        const code = urlObj.searchParams.get("code");
        if (code && pendingConnectionId) {
          codeProcessed.current = true;
          setWebViewUrl(null);
          exchangeToken(code, pendingConnectionId, pendingBank);
        }
      }
    } catch (e) {
      console.warn("URL parse error:", e);
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
      console.warn("Token exchange error:", JSON.stringify(err.response?.data || err.message));
      showToast(t("accounts.authError"), "error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchAccounts(connectionId, bankName = "BT") {
    try {
      await addConnection(connectionId, bankName);
    } catch (err) {
      console.warn("Fetch accounts error:", JSON.stringify(err?.response?.data || err?.message || err));
      const code = err?.response?.data?.error;
      if (code === "BT_SESSION_EXPIRED") {
        showToast(t("serverErrors.btSessionExpired"), "error");
      } else if (code === "BT_SANDBOX_UNAVAILABLE" || code === "BRD_SANDBOX_UNAVAILABLE") {
        showToast(t(getErrorKey(code, "accounts.connectionError")), "error");
      } else if (code === "TOKEN_EXPIRED_OR_INVALID") {
        showToast(t("serverErrors.tokenExpiredOrInvalid"), "error");
      } else {
        showToast(t("accounts.connectionError"), "error");
      }
    }
  }

  async function handleDisconnect(bankName) {
    setDisconnecting(true);
    try {
      await removeConnection(bankName);
      setDisconnectConfirm(null);
      showToast(t("accounts.disconnectSuccess", { bank: bankName }), "success");
    } catch (err) {
      console.warn("Disconnect error:", JSON.stringify(err.response?.data || err.message));
      showToast(t("accounts.disconnectError"), "error");
    } finally {
      setDisconnecting(false);
    }
  }


  function getAccountBalance(account) {
    const availableBalance = account.balances?.find(
      (b) =>
      b.balanceType === "interimAvailable" || b.balanceType === "expected"
    );
    const balance = availableBalance || account.balances?.[0];
    return {
      amount: balance?.balanceAmount?.amount || "-",
      currency:
      balance?.balanceAmount?.currency ||
      account.currency ||
      t("common.currency")
    };
  }

  const totalBalance = accounts.reduce((sum, acc) => {
    const bal = getAccountBalance(acc);
    return sum + (parseFloat(bal.amount) || 0);
  }, 0);

  const activeTrustEntries = connections.
  filter((conn) => conn.status === "active").
  map((conn) => trustByConnection[conn.id]).
  filter(Boolean);

  const hasOutdatedData = activeTrustEntries.some((item) => item.dataMayBeOutdated);
  const hasDegradedHealth = activeTrustEntries.some((item) => item.healthState === "degraded");
  const hasSandboxUnavailable = activeTrustEntries.some(
    (item) => item.healthState === "sandbox_unavailable"
  );
  return (
    <View className="flex-1 bg-background pt-14">
      {}
      <SessionExpiredBanner sessionExpired={sessionExpired} />
      <ConnectionStatusBanner
        hasOutdatedData={hasOutdatedData}
        hasDegradedHealth={hasDegradedHealth}
        hasSandboxUnavailable={hasSandboxUnavailable}
        c={c} />
      

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}>
        
        {}

        {}
        <BankCardCarousel
          BANKS={BANKS}
          BANK_CONFIG={BANK_CONFIG}
          connections={connections}
          trustByConnection={trustByConnection}
          accounts={accounts}
          getAccountBalance={getAccountBalance}
          loading={loading}
          pendingBank={pendingBank}
          startBTConnection={startBTConnection}
          startBRDConnection={startBRDConnection}
          startDemoBankConnection={startDemoBankConnection}
          activeCardIndex={activeCardIndex}
          setActiveCardIndex={setActiveCardIndex}
          setDisconnectConfirm={setDisconnectConfirm}
          c={c} />
        

        {}
        <PortfolioTotalCard
          accounts={accounts}
          connections={connections}
          totalBalance={totalBalance}
          getAccountBalance={getAccountBalance}
          BANK_CONFIG={BANK_CONFIG}
          isDark={isDark}
          c={c} />
        

        {}
        <ConnectedAccountsList
          accounts={accounts}
          connections={connections}
          getAccountBalance={getAccountBalance}
          BANK_CONFIG={BANK_CONFIG}
          activeBank={BANKS[activeCardIndex]}
          c={c} />
        

        {}
        <BenefitSection accounts={accounts} isDark={isDark} c={c} />
      </ScrollView>

      {}
      <DisconnectConfirmationModal
        disconnectConfirm={disconnectConfirm}
        setDisconnectConfirm={setDisconnectConfirm}
        disconnecting={disconnecting}
        handleDisconnect={handleDisconnect}
        c={c} />
      

      {}
      <Modal
        visible={!!webViewUrl}
        animationType="slide"
        onRequestClose={() => {
          setWebViewUrl(null);
          codeProcessed.current = false;
        }}>
        
        <View className="flex-1 bg-background">
          <LinearGradient
            colors={c.headerGradient}
            style={{
              paddingTop: 56,
              paddingBottom: 12,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
            
            <Pressable
              onPress={() => {
                setWebViewUrl(null);
                codeProcessed.current = false;
              }}>
              
              <Ionicons name="close" size={26} color={c.webViewIconColor} />
            </Pressable>
            <Text className="text-foreground font-semibold text-base">
              {pendingBank === "BRD" ?
              "Autentificare BRD" :
              t("accounts.btAuth")}
            </Text>
            <View className="w-7" />
          </LinearGradient>

          {webViewUrl &&
          <WebView
            source={{ uri: webViewUrl }}
            onNavigationStateChange={handleWebViewNavigation}
            startInLoadingState
            renderLoading={() =>
            <View className="flex-1 items-center justify-center bg-background">
                  <ActivityIndicator size="large" color="#10B981" />
                  <Text className="text-text-muted mt-4">
                    {t("accounts.loadingBT")}
                  </Text>
                </View>
            } />

          }
        </View>
      </Modal>
    </View>);

}
