import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import i18n from "../../i18n/i18n";
import { saveToInbox } from "../../services/NotificationService";
import { filterByPeriod, getCategoryBreakdown } from "../../utils/categoryUtils";

const CHECKIN_KEY = "monthly_checkin_v1";

export default function MonthlyCheckIn({
  transactions,
  budgetSummary,
  limits,
  applySuggestedBudgets,
  getSuggestedBudgets,
  profile,
  c,
  t,
  onViewed,
  onAccepted
}) {
  const [visible, setVisible] = useState(false);
  const [screen, setScreen] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CHECKIN_KEY);
        const data = raw ? JSON.parse(raw) : {};
        const now = Date.now();
        if (data.snoozeUntil && now < data.snoozeUntil) return;
        const currentMonth = new Date().getMonth();
        if (data.lastShownMonth === currentMonth) return;
        if (transactions.length > 0) {
          setVisible(true);
          onViewed?.();
          await AsyncStorage.setItem(
            CHECKIN_KEY,
            JSON.stringify({
              ...data,
              lastShownMonth: currentMonth
            })
          );
          const monthName = new Date(
            new Date().getFullYear(),
            new Date().getMonth() - 1,
            1
          ).toLocaleString(
            i18n.language?.startsWith("ro") ? "ro-RO" : "en-US",
            { month: "long" }
          );
          saveToInbox({
            type: "monthly_checkin",
            title: t("dashboard.checkin.title", { month: monthName }),
            body: t("dashboard.checkin.subtitle")
          });
        }
      } catch {

      }
    })();
  }, [onViewed, t, transactions.length]);

  const dismiss = async (snooze = false) => {
    setVisible(false);
    setScreen(0);
    if (snooze) {
      const data = { snoozeUntil: Date.now() + 3 * 24 * 60 * 60 * 1000 };
      await AsyncStorage.setItem(CHECKIN_KEY, JSON.stringify(data));
    }
  };

  const lastMonthTx = filterByPeriod(transactions, 1);
  const lastMonthIncome = lastMonthTx.
  filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) > 0).
  reduce((s, tx) => s + parseFloat(tx.transactionAmount?.amount || 0), 0);
  const lastMonthExpenses = lastMonthTx.
  filter((tx) => parseFloat(tx.transactionAmount?.amount || 0) < 0).
  reduce(
    (s, tx) => s + Math.abs(parseFloat(tx.transactionAmount?.amount || 0)),
    0
  );
  const lastMonthSaved = Math.max(lastMonthIncome - lastMonthExpenses, 0);
  const topCats = getCategoryBreakdown(lastMonthTx).slice(0, 3);

  const lastMonthName = new Date(
    new Date().getFullYear(),
    new Date().getMonth() - 1,
    1
  ).toLocaleString(i18n.language?.startsWith("ro") ? "ro-RO" : "en-US", {
    month: "long"
  });

  const suggestions = profile ? getSuggestedBudgets(profile) : [];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => dismiss()}>
      
      <View
        style={{
          flex: 1,
          backgroundColor: "#00000088",
          justifyContent: "flex-end"
        }}>
        
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            paddingBottom: 48
          }}>
          
          {screen === 0 ?
          <>
              {}
              <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6
              }}>
              
                <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: `${c.primary}20`,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10
                }}>
                
                  <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={c.primary} />
                
                </View>
                <Text
                style={{
                  color: c.foreground,
                  fontWeight: "800",
                  fontSize: 18,
                  flex: 1
                }}>
                
                  {t("dashboard.checkin.title", { month: lastMonthName })}
                </Text>
                <Pressable onPress={() => dismiss()} hitSlop={8}>
                  <Ionicons name="close" size={22} color={c.textMuted} />
                </Pressable>
              </View>
              <Text
              style={{ color: c.textMuted, fontSize: 13, marginBottom: 20 }}>
              
                {t("dashboard.checkin.subtitle")}
              </Text>

              {}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
                {[
              {
                label: t("dashboard.checkin.spent"),
                value: lastMonthExpenses,
                color: c.expense
              },
              {
                label: t("dashboard.checkin.income"),
                value: lastMonthIncome,
                color: c.primary
              },
              {
                label: t("dashboard.checkin.saved"),
                value: lastMonthSaved,
                color: "#10B981"
              }].
              map((stat) =>
              <View
                key={stat.label}
                style={{
                  flex: 1,
                  backgroundColor: c.card,
                  borderRadius: 14,
                  padding: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: c.border
                }}>
                
                    <Text
                  style={{
                    color: stat.color,
                    fontWeight: "800",
                    fontSize: 16
                  }}>
                  
                      {Math.round(stat.value)}
                    </Text>
                    <Text
                  style={{
                    color: c.textMuted,
                    fontSize: 10,
                    textAlign: "center",
                    marginTop: 2
                  }}>
                  
                      {stat.label}
                    </Text>
                  </View>
              )}
              </View>

              {}
              {topCats.length > 0 &&
            <View style={{ marginBottom: 20 }}>
                  <Text
                style={{
                  color: c.foreground,
                  fontWeight: "700",
                  fontSize: 14,
                  marginBottom: 10
                }}>
                
                    {t("dashboard.checkin.topCategories")}
                  </Text>
                  {topCats.map((cat) =>
              <View
                key={cat.key}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8
                }}>
                
                      <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    backgroundColor: `${cat.color}18`,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10
                  }}>
                  
                        <Ionicons name={cat.icon} size={15} color={cat.color} />
                      </View>
                      <Text
                  style={{ color: c.foreground, fontSize: 13, flex: 1 }}>
                  
                        {t(`analytics.categories.${cat.key}`)}
                      </Text>
                      <Text
                  style={{
                    color: c.foreground,
                    fontWeight: "700",
                    fontSize: 13
                  }}>
                  
                        {Math.round(cat.total)} RON
                      </Text>
                    </View>
              )}
                </View>
            }

              {suggestions.length > 0 ?
            <Pressable
              onPress={() => setScreen(1)}
              style={{
                backgroundColor: c.primary,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                marginBottom: 10
              }}>
              
                  <Text
                style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                
                    {t("dashboard.checkin.adjustTitle")} →
                  </Text>
                </Pressable> :
            null}

              <Pressable
              onPress={() => dismiss(true)}
              style={{ alignItems: "center", paddingVertical: 8 }}>
              
                <Text style={{ color: c.textMuted, fontSize: 13 }}>
                  {t("dashboard.checkin.remindLater")}
                </Text>
              </Pressable>
            </> :

          <>
              {}
              <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6
              }}>
              
                <Pressable
                onPress={() => setScreen(0)}
                hitSlop={8}
                style={{ marginRight: 10 }}>
                
                  <Ionicons name="arrow-back" size={22} color={c.textMuted} />
                </Pressable>
                <Text
                style={{
                  color: c.foreground,
                  fontWeight: "800",
                  fontSize: 18,
                  flex: 1
                }}>
                
                  {t("dashboard.checkin.adjustTitle")}
                </Text>
              </View>
              <Text
              style={{ color: c.textMuted, fontSize: 13, marginBottom: 20 }}>
              
                {t("dashboard.checkin.adjustSubtitle")}
              </Text>
              {suggestions.slice(0, 5).map((s) => {
              const cat = [
              { key: "food", icon: "restaurant", color: "#F59E0B" },
              { key: "transport", icon: "car", color: "#3B82F6" },
              { key: "shopping", icon: "bag-handle", color: "#EC4899" },
              { key: "utilities", icon: "flash", color: "#8B5CF6" },
              { key: "housing", icon: "home", color: "#14B8A6" },
              {
                key: "entertainment",
                icon: "game-controller",
                color: "#F97316"
              },
              { key: "health", icon: "medkit", color: "#EF4444" },
              {
                key: "other",
                icon: "ellipsis-horizontal",
                color: "#6B7280"
              }].
              find((x) => x.key === s.key) || {
                icon: "ellipsis-horizontal",
                color: "#6B7280"
              };
              return (
                <View
                  key={s.key}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 8,
                    borderBottomWidth: 0.5,
                    borderBottomColor: c.border
                  }}>
                  
                    <Ionicons
                    name={cat.icon}
                    size={16}
                    color={cat.color}
                    style={{ marginRight: 10 }} />
                  
                    <Text
                    style={{ color: c.foreground, fontSize: 14, flex: 1 }}>
                    
                      {t(`analytics.categories.${s.key}`)}
                    </Text>
                    <Text
                    style={{
                      color: c.textMuted,
                      fontSize: 11,
                      marginRight: 8
                    }}>
                    
                      {limits[s.key] ? `${Math.round(limits[s.key])} → ` : ""}
                    </Text>
                    <Text
                    style={{
                      color: c.foreground,
                      fontWeight: "700",
                      fontSize: 14
                    }}>
                    
                      {Math.round(s.suggestedLimit)} RON
                    </Text>
                  </View>);

            })}
              <Pressable
              onPress={() => {
                applySuggestedBudgets(suggestions);
                onAccepted?.();
                dismiss();
              }}
              style={{
                backgroundColor: c.primary,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                marginTop: 20,
                marginBottom: 10
              }}>
              
                <Text
                style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                
                  {t("dashboard.checkin.accept")}
                </Text>
              </Pressable>
              <Pressable
              onPress={() => dismiss()}
              style={{ alignItems: "center", paddingVertical: 8 }}>
              
                <Text style={{ color: c.textMuted, fontSize: 13 }}>
                  {t("dashboard.checkin.dismiss")}
                </Text>
              </Pressable>
            </>
          }
        </View>
      </View>
    </Modal>);

}