import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View } from
"react-native";
import { useBankData } from "../../context/BankContext";
import { useBudget } from "../../context/BudgetContext";
import { useInsights } from "../../context/InsightsContext";
import { useOnboarding } from "../../context/OnboardingContext";
import { useTheme } from "../../context/ThemeContext";
import i18n from "../../i18n/i18n";
import api from "../../services/api";
import { scheduleAdvisorFollowUpReminder } from "../../services/NotificationService";

const REQUEST_TIMEOUT_MS = 30000;

function TypingIndicator({ c, isDark }) {
  return (
    <View style={{ marginBottom: 16, alignSelf: "flex-start" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: isDark ? "rgba(30,41,59,0.7)" : "rgba(255,255,255,0.9)",
          borderRadius: 20,
          borderBottomLeftRadius: 4,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
        }}>
        
        <ActivityIndicator size="small" color="#10B981" />
        <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "500" }}>Novence scrie...</Text>
      </View>
    </View>);

}

function AdvisorMessageText({ text, isError, isDark }) {
  const lines = (text || "").split("\n");

  return (
    <View>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        const isHeading = (trimmed.endsWith(":") || trimmed.startsWith("**")) && trimmed.length < 60;
        const isBullet = /^[-*•]\s/.test(trimmed);

        return (
          <Text
            key={`${trimmed}-${idx}`}
            style={{
              fontSize: 14,
              color: isError ? "#F87171" : isDark ? "rgba(255,255,255,0.9)" : "rgba(15,23,42,0.9)",
              lineHeight: 22,
              marginBottom: idx === lines.length - 1 ? 0 : 8,
              fontWeight: isHeading ? "700" : "400"
            }}>
            
            {isBullet ? `• ${trimmed.replace(/^[-*•]\s/, "")}` : line}
          </Text>);

      })}
    </View>);

}

export default function Advisor() {
  const { theme, isDark } = useTheme();
  const c = theme.colors;
  const { t } = useTranslation();
  const { transactions, accounts, getTotalBalance } = useBankData();
  const { getBudgetSummary } = useBudget();
  const { profile } = useOnboarding();
  const { trackKpiEvent } = useInsights();


  const INITIAL_MESSAGES = useMemo(
    () => [
    {
      id: "1",
      role: "assistant",
      text: t("advisor.initialMessage")
    }],

    [t]
  );

  const SUGGESTIONS = useMemo(
    () => [
    t("advisor.suggestion1"),
    t("advisor.suggestion2"),
    t("advisor.suggestion3"),
    t("advisor.suggestion4")],

    [t]
  );

  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedPrompt, setLastFailedPrompt] = useState("");
  const [followUpCards, setFollowUpCards] = useState([]);
  const [acceptedFollowUps, setAcceptedFollowUps] = useState({});
  const scrollRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);


  const buildFinancialData = useCallback(() => {
    return {
      totalBalance: getTotalBalance(),
      accounts: accounts.map((acc) => ({
        iban: acc.iban,
        currency: acc.currency,
        balances: acc.balances,
        bankName: acc.bankName
      })),
      transactions: transactions.map((tx) => ({
        transactionId: tx.transactionId,
        bookingDate: tx.bookingDate,
        transactionAmount: tx.transactionAmount,
        remittanceInformationUnstructured: tx.remittanceInformationUnstructured,
        creditorName: tx.creditorName,
        debtorName: tx.debtorName
      })),
      budgets: getBudgetSummary(),
      userProfile: profile ?? null
    };
  }, [transactions, accounts, getTotalBalance, getBudgetSummary, profile]);


  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      text
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setLastFailedPrompt("");
    scrollToBottom();

    try {
      const language = i18n.language?.startsWith("ro") ? "ro" : "en";


      const apiMessages = updatedMessages.
      filter((m) => !(m.id === "1" && m.role === "assistant")).
      map((m) => ({ role: m.role, text: m.text }));

      const { data } = await api.post(
        "/advisor/chat",
        {
          messages: apiMessages,
          financialData: buildFinancialData(),
          language
        },
        { timeout: REQUEST_TIMEOUT_MS }
      );

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: data.reply
      };

      setMessages((prev) => [...prev, aiMsg]);
      setFollowUpCards(data.followUpCards || []);
      AccessibilityInfo.announceForAccessibility?.(
        t("advisor.replyReceivedA11y")
      );
    } catch (err) {
      const errCode = err.response?.data?.error;
      const isTimeout =
      errCode === "ADVISOR_TIMEOUT" ||
      err.code === "ECONNABORTED" ||
      err.message?.toLowerCase().includes("timeout");
      const isNetwork =
      !err.response && (
      err.message?.toLowerCase().includes("network") ||
      err.code === "ERR_NETWORK" ||
      err.code === "ENOTFOUND");
      let errorText;
      if (
      errCode === "GEMINI_NOT_CONFIGURED" ||
      errCode === "GEMINI_KEY_INVALID")
      {
        errorText = t("advisor.errorNotConfigured");
      } else if (errCode === "GEMINI_QUOTA_EXCEEDED") {
        errorText = t("advisor.errorQuota");
      } else if (isTimeout) {
        errorText = t("advisor.errorTimeout");
      } else if (isNetwork) {
        errorText = t("advisor.errorNetwork");
      } else {
        errorText = t("advisor.errorGeneric");
      }
      setLastFailedPrompt(text);
      setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: errorText,
        isError: true
      }]
      );
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [input, isLoading, messages, buildFinancialData, scrollToBottom, t]);

  const retryLastPrompt = useCallback(() => {
    if (!lastFailedPrompt || isLoading) return;
    setInput(lastFailedPrompt);
  }, [isLoading, lastFailedPrompt]);

  const acceptFollowUp = useCallback(
    async (card) => {
      if (!card?.id) return;

      setAcceptedFollowUps((prev) => ({
        ...prev,
        [card.id]: true
      }));

      const reminderInHours = Number(card?.reminderHours || 24);
      const dueAt = Date.now() + reminderInHours * 60 * 60 * 1000;

      await scheduleAdvisorFollowUpReminder({
        reminderId: card.id,
        title: t("advisor.followUpReminderTitle"),
        body: card.body,
        dueAt,
        ctaType: card.actionType || "open_advisor"
      });

      trackKpiEvent("advisor_followup_accept", {
        metadata: {
          followUpId: card.id,
          reminderHours: reminderInHours
        }
      });
    },
    [t, trackKpiEvent]
  );

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      style={{ backgroundColor: c.backgroundColor }}>
      
      <LinearGradient
        colors={isDark ?
        ["rgba(16,185,129,0.05)", "rgba(99,102,241,0.05)", "transparent"] :
        ["rgba(16,185,129,0.03)", "rgba(99,102,241,0.03)", "transparent"]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      

      {}
      <View
        style={{
          paddingTop: 56,
          paddingBottom: 16,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
          backgroundColor: isDark ? "rgba(15,23,42,0.8)" : "rgba(255,255,255,0.8)"
        }}>
        
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
                borderWidth: 1,
                borderColor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.1)"
              }}>
              
              <LinearGradient
                colors={["#10B981", "#3B82F6"]}
                style={{ width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}>
                
                <Ionicons name="sparkles" size={16} color="white" />
              </LinearGradient>
            </View>
            <View>
              <Text style={{ color: c.foreground, fontSize: 17, fontWeight: "700" }}>
                {t("advisor.title")}
              </Text>
              <View className="flex-row items-center">
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981", marginRight: 6 }} />
                <Text style={{ color: "#10B981", fontSize: 11, fontWeight: "600" }}>
                  {t("advisor.online")}
                </Text>
              </View>
            </View>
          </View>
          
          <Pressable
            onPress={() => setMessages(INITIAL_MESSAGES)}
            style={{
              padding: 8,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"
            }}>
            
            <Ionicons name="trash-outline" size={18} color={c.textMuted} />
          </Pressable>
        </View>
      </View>

      {}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}>
        
        {messages.map((msg) =>
        <View
          key={msg.id}
          style={{
            marginBottom: 16,
            maxWidth: "85%",
            alignSelf: msg.role === "user" ? "flex-end" : "flex-start"
          }}>
          
            {msg.role === "user" ?
          <View style={{ borderRadius: 20, overflow: "hidden", elevation: 2, shadowColor: "#10B981", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                <LinearGradient
              colors={["#10B981", "#3B82F6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12
              }}>
              
                  <Text style={{ color: "white", fontSize: 14, lineHeight: 20, fontWeight: "500" }}>
                    {msg.text}
                  </Text>
                </LinearGradient>
              </View> :

          <View
            style={{
              borderRadius: 20,
              borderBottomLeftRadius: 4,
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: msg.isError ?
              "rgba(239,68,68,0.1)" :
              isDark ?
              "rgba(30,41,59,0.7)" :
              "rgba(255,255,255,0.9)",
              borderWidth: 1,
              borderColor: msg.isError ?
              "rgba(239,68,68,0.2)" :
              isDark ?
              "rgba(255,255,255,0.1)" :
              "rgba(0,0,0,0.05)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2
            }}>
            
                <AdvisorMessageText text={msg.text} isError={msg.isError} isDark={isDark} />
              </View>
          }
          </View>
        )}

        {}
        {isLoading && <TypingIndicator c={c} isDark={isDark} />}
      </ScrollView>

      {}
      {messages.length <= 2 && !isLoading &&
      <View style={{ paddingBottom: 8 }}>
          <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
          
            {SUGGESTIONS.map((sug) =>
          <Pressable
            key={sug}
            onPress={() => setInput(sug)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 20,
              backgroundColor: isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.05)",
              borderWidth: 1,
              borderColor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.15)"
            }}>
            
                <Text style={{ color: c.foreground, fontSize: 13, fontWeight: "500" }}>
                  {sug}
                </Text>
              </Pressable>
          )}
          </ScrollView>
        </View>
      }

      {lastFailedPrompt && !isLoading &&
      <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          <Pressable
          onPress={retryLastPrompt}
          style={{
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 20,
            backgroundColor: "rgba(239,68,68,0.1)",
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.2)",
            gap: 8
          }}>
          
            <Ionicons name="refresh" size={16} color="#F87171" />
            <Text style={{ color: "#F87171", fontSize: 13, fontWeight: "600" }}>
              {t("advisor.retry")}
            </Text>
          </Pressable>
        </View>
      }

      {followUpCards.length > 0 && !isLoading &&
      <View style={{ paddingHorizontal: 20, marginTop: 16, marginBottom: 10 }}>
          <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, marginLeft: 4 }}>
            {t("advisor.followUpTitle", { defaultValue: "ACȚIUNI RECOMANDATE" })}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
            {followUpCards.map((card) =>
          <View
            key={card.id}
            style={{
              width: 260,
              borderRadius: 24,
              padding: 16,
              backgroundColor: isDark ? "rgba(30,41,59,0.7)" : "rgba(255,255,255,0.9)",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,185,129,0.1)" : "rgba(16,185,129,0.1)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4
            }}>
            
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(16,185,129,0.1)", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                    <Ionicons name="flash" size={16} color="#10B981" />
                  </View>
                  <Text style={{ color: c.foreground, fontSize: 14, fontWeight: "700", flex: 1 }} numberOfLines={1}>
                    {card.title}
                  </Text>
                </View>
                
                <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 12 }} numberOfLines={3}>
                  {card.body}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                  <View>
                    <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: "600" }}>{card.metric}</Text>
                    <Text style={{ color: "#10B981", fontSize: 12, fontWeight: "700" }}>{card.metricValue}</Text>
                  </View>
                  <Pressable
                onPress={() => acceptFollowUp(card)}
                disabled={Boolean(acceptedFollowUps[card.id])}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: acceptedFollowUps[card.id] ? "rgba(16,185,129,0.1)" : "#10B981"
                }}>
                
                    <Text style={{ color: acceptedFollowUps[card.id] ? "#10B981" : "white", fontSize: 11, fontWeight: "700" }}>
                      {acceptedFollowUps[card.id] ? "ADĂUGAT" : "PLANIFICĂ"}
                    </Text>
                  </Pressable>
                </View>
              </View>
          )}
          </ScrollView>
        </View>
      }

      {}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Platform.OS === "ios" ? 34 : 20,
          backgroundColor: "transparent"
        }}>
        
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: isDark ? "rgba(30,41,59,0.95)" : "rgba(255,255,255,0.98)",
            borderRadius: 28,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8
          }}>
          
          <TextInput
            style={{
              flex: 1,
              color: c.foreground,
              fontSize: 15,
              maxHeight: 120,
              paddingTop: 4,
              paddingBottom: 4
            }}
            placeholder={t("advisor.inputPlaceholder")}
            placeholderTextColor={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            editable={!isLoading}
            multiline
            maxLength={1000} />
          
          <Pressable
            onPress={sendMessage}
            disabled={!input.trim() || isLoading}
            style={{
              width: 44,
              height: 44,
              borderRadius: 18,
              backgroundColor: input.trim() && !isLoading ? "#10B981" : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 12
            }}>
            
            {isLoading ?
            <ActivityIndicator size="small" color={c.textMuted} /> :

            <Ionicons
              name="arrow-up"
              size={22}
              color={input.trim() ? "white" : c.textMuted} />

            }
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>);

}