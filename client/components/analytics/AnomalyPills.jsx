import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";











export default function AnomalyPills({ anomalies, onTapAnomaly, c, isDark, t }) {
  if (!anomalies || anomalies.length === 0) return null;

  const severityBg = {
    high: isDark ? "rgba(244,63,94,0.10)" : "rgba(244,63,94,0.08)",
    medium: isDark ? "rgba(245,158,11,0.10)" : "rgba(245,158,11,0.08)",
    positive: isDark ? "rgba(16,185,129,0.10)" : "rgba(16,185,129,0.08)"
  };

  const severityBorder = {
    high: "rgba(244,63,94,0.25)",
    medium: "rgba(245,158,11,0.25)",
    positive: "rgba(16,185,129,0.25)"
  };

  const getAnomalyText = (anomaly) => {
    if (anomaly.messageKey && t) {
      const params = { ...anomaly.messageParams };
      if (params.category) {
        params.category = t(`analytics.categories.${params.category}`);
      }
      const translated = t(anomaly.messageKey, params);

      if (translated !== anomaly.messageKey) return translated;
    }
    return anomaly.message;
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
      
      {anomalies.slice(0, 5).map((anomaly, idx) =>
      <Pressable
        key={`${anomaly.type}-${idx}`}
        onPress={() => onTapAnomaly?.(anomaly)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: severityBg[anomaly.severity] || severityBg.medium,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 10,
          gap: 8,
          borderWidth: 1,
          borderColor:
          severityBorder[anomaly.severity] || severityBorder.medium,
          maxWidth: 260
        }}>
        
          <Ionicons name={anomaly.icon} size={16} color={anomaly.color} />
          <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: anomaly.color,
            flexShrink: 1
          }}
          numberOfLines={2}>
          
            {getAnomalyText(anomaly)}
          </Text>
        </Pressable>
      )}
    </ScrollView>);

}