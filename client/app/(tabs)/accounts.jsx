import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
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
import SectionHeader from "../../components/SectionHeader";
import ConnectionStatusBanner from "../../components/accounts/ConnectionStatusBanner";
import SessionExpiredBanner from "../../components/accounts/SessionExpiredBanner";
import BankCardCarousel from "../../components/accounts/BankCardCarousel";
import PortfolioTotalCard from "../../components/accounts/PortfolioTotalCard";
import ConnectedAccountsList from "../../components/accounts/ConnectedAccountsList";
import BenefitSection from "../../components/accounts/BenefitSection";
import DisconnectConfirmationModal from "../../components/accounts/DisconnectConfirmationModal";
import { useBankData } from "../../context/BankContext";
import api from "../../services/api";
import { getErrorKey } from "../../utils/errorCodes";
import { WebView } from "react-native-webview";

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
    initials: "BT"
  },
  BRD: {
    label: "BRD",
    color: "#E3000F",
    bgColor: "rgba(227,0,15,0.10)",
    cardGradient: ["#660007", "#A8000C"],
    logo: require("../../assets/images/BRDlogo.png"),
    initials: "BRD"
  }
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

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {

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
        connectionId
      });
      const { authUrl } = consentRes.data;

      setPendingBank("BT");
      setPendingConnectionId(connectionId);
      setWebViewUrl(authUrl);
    } catch (err) {
      console.error("BT Connection error:", err.response?.data || err.message);
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
      console.error("BRD Connection error:", err.response?.data || err.message);
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
      const code = err?.response?.data?.error;
      if (code === "BT_SESSION_EXPIRED") {
        showToast("Sesiunea a fost respinsă de BT Sandbox. Te rugăm să încerci din nou.", "error");
      } else if (code === "TOKEN_EXPIRED_OR_INVALID") {
        showToast("Sesiunea ta a expirat. Te rugăm să dai un refresh sau să te loghezi din nou.", "error");
      } else {
        showToast("Eroare la aducerea conturilor. Verifică logurile.", "error");
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
      console.error("Disconnect error:", err.response?.data || err.message);
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
      amount: balance?.balanceAmount?.amount || "â€”",
      currency:
      balance?.balanceAmount?.currency ||
      account.currency ||
      t("common.currency")
    };
  }


  function formatIban(iban) {
    if (!iban) return "";
    return iban.replace(/(.{4})/g, "$1 ").trim();
  }


  const totalBalance = accounts.reduce((sum, acc) => {
    const bal = getAccountBalance(acc);
    return sum + (parseFloat(bal.amount) || 0);
  }, 0);


  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTx = transactions.filter((tx) => {
    const d = new Date(tx.bookingDate || tx.valueDate);
    return d >= monthStart && d <= now;
  });
  const monthlyIncome = monthlyTx.
  filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) > 0).
  reduce((s, tx) => s + parseFloat(tx.transactionAmount?.amount || 0), 0);
  const monthlyExpenses = monthlyTx.
  filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0).
  reduce(
    (s, tx) => s + Math.abs(parseFloat(tx.transactionAmount?.amount || 0)),
    0
  );

  const activeTrustEntries = connections.
  filter((conn) => conn.status === "active").
  map((conn) => trustByConnection[conn.id]).
  filter(Boolean);

  const hasOutdatedData = activeTrustEntries.some((item) => item.dataMayBeOutdated);
  const hasDegradedHealth = activeTrustEntries.some((item) => item.healthState === "degraded");
  return (
    <View className="flex-1 bg-background pt-14">
      {}
      <SessionExpiredBanner sessionExpired={sessionExpired} />
      <ConnectionStatusBanner
        hasOutdatedData={hasOutdatedData}
        hasDegradedHealth={hasDegradedHealth}
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