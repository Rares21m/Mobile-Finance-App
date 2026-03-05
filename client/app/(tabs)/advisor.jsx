import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { useBankData } from "../../context/BankContext";
import { useBudget } from "../../context/BudgetContext";
import { useOnboarding } from "../../context/OnboardingContext";
import { useTheme } from "../../context/ThemeContext";
import i18n from "../../i18n/i18n";
import api from "../../services/api";

// ─── Typing indicator bubble ──────────────────────────────────────────────────
function TypingIndicator({ c }) {
  return (
    <View className="mb-3 max-w-[85%] self-start">
      <View
        className="bg-surface rounded-2xl rounded-bl-sm px-4 py-3 border border-border"
        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
      >
        <ActivityIndicator size="small" color={c.primary || "#10B981"} />
        <Text className="text-text-muted text-sm">...</Text>
      </View>
    </View>
  );
}

export default function Advisor() {
  const { isDark, theme } = useTheme();
  const c = theme.colors;
  const { t } = useTranslation();
  const { transactions, accounts, getTotalBalance } = useBankData();
  const { getBudgetSummary } = useBudget();
  const { profile } = useOnboarding();

  // ── Initial state ────────────────────────────────────────────────────────
  const INITIAL_MESSAGES = useMemo(
    () => [
      {
        id: "1",
        role: "assistant",
        text: t("advisor.initialMessage"),
      },
    ],
    [t],
  );

  const SUGGESTIONS = useMemo(
    () => [
      t("advisor.suggestion1"),
      t("advisor.suggestion2"),
      t("advisor.suggestion3"),
      t("advisor.suggestion4"),
    ],
    [t],
  );

  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // ── Build financial data payload ─────────────────────────────────────────
  const buildFinancialData = useCallback(() => {
    return {
      totalBalance: getTotalBalance(),
      accounts: accounts.map((acc) => ({
        iban: acc.iban,
        currency: acc.currency,
        balances: acc.balances,
        bankName: acc.bankName,
      })),
      transactions: transactions.map((tx) => ({
        transactionId: tx.transactionId,
        bookingDate: tx.bookingDate,
        transactionAmount: tx.transactionAmount,
        remittanceInformationUnstructured: tx.remittanceInformationUnstructured,
        creditorName: tx.creditorName,
        debtorName: tx.debtorName,
      })),
      budgets: getBudgetSummary(),
      userProfile: profile ?? null,
    };
  }, [transactions, accounts, getTotalBalance, getBudgetSummary, profile]);

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      text,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    scrollToBottom();

    try {
      const language = i18n.language?.startsWith("ro") ? "ro" : "en";

      // Send all messages except the initial assistant greeting as history
      const apiMessages = updatedMessages
        .filter((m) => !(m.id === "1" && m.role === "assistant"))
        .map((m) => ({ role: m.role, text: m.text }));

      const { data } = await api.post(
        "/advisor/chat",
        {
          messages: apiMessages,
          financialData: buildFinancialData(),
          language,
        },
        { timeout: 45000 },
      );

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: data.reply,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errCode = err.response?.data?.error;
      let errorText;
      if (
        errCode === "GEMINI_NOT_CONFIGURED" ||
        errCode === "GEMINI_KEY_INVALID"
      ) {
        errorText = t("advisor.errorNotConfigured");
      } else if (errCode === "GEMINI_QUOTA_EXCEEDED") {
        errorText = t("advisor.errorQuota");
      } else {
        errorText = t("advisor.errorGeneric");
      }
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: errorText,
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [input, isLoading, messages, buildFinancialData, scrollToBottom, t]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {/* ===== HEADER ===== */}
      <LinearGradient
        colors={c.headerGradient}
        style={{
          paddingTop: 56,
          paddingBottom: 16,
          paddingHorizontal: 20,
          borderBottomWidth: 0.5,
          borderBottomColor: c.border,
        }}
      >
        <View className="flex-row items-center">
          <View className="w-11 h-11 rounded-xl overflow-hidden mr-3">
            <LinearGradient
              colors={["#10B981", "#6366F1"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="sparkles" size={22} color="#fff" />
            </LinearGradient>
          </View>
          <View>
            <Text className="text-foreground text-lg font-bold">
              {t("advisor.title")}
            </Text>
            <Text className="text-primary text-xs font-medium">
              {t("advisor.online")}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ===== MESSAGES ===== */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            className={`mb-3 max-w-[85%] ${
              msg.role === "user" ? "self-end" : "self-start"
            }`}
          >
            {msg.role === "user" ? (
              <View className="rounded-2xl rounded-br-sm overflow-hidden">
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <Text className="text-white text-sm leading-5">
                    {msg.text}
                  </Text>
                </LinearGradient>
              </View>
            ) : (
              <View
                className={`rounded-2xl rounded-bl-sm px-4 py-3 border ${
                  msg.isError
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-surface border-border"
                }`}
              >
                <Text
                  className={`text-sm leading-5 ${
                    msg.isError ? "text-red-400" : "text-text-muted"
                  }`}
                >
                  {msg.text}
                </Text>
              </View>
            )}
          </View>
        ))}

        {/* Typing indicator */}
        {isLoading && <TypingIndicator c={c} />}

        {/* Quick suggestions */}
        {messages.length <= 2 && !isLoading && (
          <View className="mt-4 gap-2.5">
            <Text className="text-text-muted text-xs mb-1">
              {t("advisor.suggestions")}
            </Text>
            {SUGGESTIONS.map((sug) => (
              <Pressable
                key={sug}
                className="border border-primary/20 rounded-2xl px-4 py-3 active:opacity-70 bg-primary/[0.04]"
                onPress={() => setInput(sug)}
              >
                <Text className="text-text-muted text-sm">{sug}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ===== INPUT BAR ===== */}
      <View className="px-4 py-3 border-t border-border bg-background">
        <View className="flex-row items-center bg-surface rounded-2xl px-4 py-2 border border-border">
          <TextInput
            className="flex-1 text-foreground text-sm py-2"
            placeholder={t("advisor.inputPlaceholder")}
            placeholderTextColor="#94A3B8"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            editable={!isLoading}
            multiline
            maxLength={500}
          />
          <Pressable
            className="w-9 h-9 rounded-xl items-center justify-center ml-2 overflow-hidden"
            onPress={sendMessage}
            disabled={!input.trim() || isLoading}
          >
            {input.trim() && !isLoading ? (
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="arrow-up" size={18} color="white" />
              </LinearGradient>
            ) : (
              <View className="w-9 h-9 rounded-xl bg-primary/20 items-center justify-center">
                {isLoading ? (
                  <ActivityIndicator size="small" color="#6B7280" />
                ) : (
                  <Ionicons name="arrow-up" size={18} color="#6B7280" />
                )}
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
