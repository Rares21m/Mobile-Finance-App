import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";





export default function SafeToSpendHero({ data, c, isDark, t }) {
  const { safeToSpend, dailyLimit, daysLeft, isProjectedIncome } = data;

  return (
    <View
      style={{
        alignItems: "center",
        paddingVertical: 24,
        paddingHorizontal: 20,
        backgroundColor: isDark ? "rgba(16,185,129,0.05)" : "rgba(16,185,129,0.03)",
        borderRadius: 32,
        borderWidth: 1,
        borderColor: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)",
        marginHorizontal: 24,
        marginTop: 16
      }}>
      
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.08)",
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 20,
          marginBottom: 16
        }}>
        
        <Ionicons
          name="shield-checkmark-outline"
          size={14}
          color="#10B981"
          style={{ marginRight: 6 }} />
        
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: "#10B981",
            textTransform: "uppercase",
            letterSpacing: 1
          }}>
          
          {t("analytics.present.safeToSpendTitle")}
        </Text>
      </View>

      <Text
        style={{
          fontSize: 48,
          fontWeight: "800",
          color: c.foreground,
          textAlign: "center"
        }}>
        
        {safeToSpend.toLocaleString("ro-RO", { maximumFractionDigits: 0 })}
        <Text style={{ fontSize: 24, fontWeight: "600", color: c.textMuted }}>
          {" "}
          RON
        </Text>
      </Text>

      {isProjectedIncome &&
      <Text
        style={{
          fontSize: 10,
          color: c.textMuted,
          marginTop: 4,
          fontStyle: "italic"
        }}>
        
          * {t("analytics.present.projectedIncomeHint")}
        </Text>
      }

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 24,
          paddingTop: 20,
          borderTopWidth: 1,
          borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
          width: "100%"
        }}>
        
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 10, color: c.textMuted, marginBottom: 4 }}>
            {t("analytics.present.dailyLimit")}
          </Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#10B981" }}>
            {dailyLimit.toLocaleString("ro-RO", { maximumFractionDigits: 0 })}
            <Text style={{ fontSize: 12, fontWeight: "500" }}> RON</Text>
          </Text>
        </View>

        <View
          style={{
            width: 1,
            height: 30,
            backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"
          }} />
        

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 10, color: c.textMuted, marginBottom: 4 }}>
            {t("analytics.present.daysLeft")}
          </Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.foreground }}>
            {daysLeft}
            <Text style={{ fontSize: 12, fontWeight: "500" }}> {t("common.days")}</Text>
          </Text>
        </View>
      </View>
    </View>);

}