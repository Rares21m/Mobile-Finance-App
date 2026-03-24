import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

export default function BudgetAlerts({ alerts, router, c, t }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <View style={{ marginBottom: 16 }}>
      {alerts.map((alert) => {
        const isOver = alert.status === "over";
        const color = isOver ? c.expense : "#F59E0B";
        const icon = isOver ? "alert-circle" : "warning";
        return (
          <Pressable
            key={alert.key}
            onPress={() => router.push("/(tabs)/budget")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: `${color}10`,
              borderRadius: 16,
              padding: 12,
              paddingHorizontal: 16,
              marginBottom: 8
            }}>
            
            <Ionicons
              name={icon}
              size={18}
              color={color}
              style={{ marginRight: 12 }} />
            
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: color, fontWeight: "700", fontSize: 13 }}>
                
                {isOver ?
                t("dashboard.budgetAlert.over", {
                  category: t(`analytics.categories.${alert.key}`)
                }) :
                t("dashboard.budgetAlert.warning", {
                  category: t(`analytics.categories.${alert.key}`),
                  pct: alert.percentage
                })}
              </Text>
            </View>
            <Text
              style={{ color, fontWeight: "800", fontSize: 13, marginLeft: 8 }}>
              
              {alert.percentage}%
            </Text>
          </Pressable>);

      })}
    </View>);

}