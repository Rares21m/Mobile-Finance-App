import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";













export default function SmartSummary({
  totalIncome,
  totalExpenses,
  spendingInsights,
  cashFlowForecast,
  categoryData,
  c,
  isDark,
  t
}) {
  const bullets = [];


  const net = totalIncome - totalExpenses;
  bullets.push({
    icon: net >= 0 ? "checkmark-circle" : "warning",
    color: net >= 0 ? "#10B981" : "#F43F5E",
    text:
    net >= 0 ?
    t("analytics.smart.netPositive", {
      amount: net.toLocaleString("ro-RO", { maximumFractionDigits: 0 })
    }) :
    t("analytics.smart.netNegative", {
      amount: Math.abs(net).toLocaleString("ro-RO", {
        maximumFractionDigits: 0
      })
    })
  });


  if (spendingInsights) {
    const pct = spendingInsights.percentChange;
    if (pct !== 0) {
      bullets.push({
        icon: pct <= 0 ? "trending-down" : "trending-up",
        color: pct <= 0 ? "#22C55E" : "#F43F5E",
        text:
        pct <= 0 ?
        t("analytics.smart.spendingDown", {
          pct: Math.abs(pct).toFixed(0)
        }) :
        t("analytics.smart.spendingUp", { pct: pct.toFixed(0) })
      });
    }
  }


  if (categoryData && categoryData.length > 0) {
    const top = categoryData[0];
    bullets.push({
      icon: top.icon,
      color: top.color,
      text: t("analytics.smart.topCategory", {
        category: t(`analytics.categories.${top.key}`),
        amount: top.total.toLocaleString("ro-RO", { maximumFractionDigits: 0 }),
        pct: top.percentage
      })
    });
  }


  if (cashFlowForecast && cashFlowForecast.savingsRateToDate !== undefined) {
    const sr = cashFlowForecast.savingsRateToDate;
    bullets.push({
      icon: sr >= 20 ? "trophy" : sr >= 10 ? "thumbs-up" : "alert-circle",
      color: sr >= 20 ? "#10B981" : sr >= 10 ? "#F59E0B" : "#F43F5E",
      text: t("analytics.smart.savingsRate", { pct: sr })
    });
  }

  if (bullets.length === 0) return null;

  return (
    <View
      style={{
        backgroundColor: isDark ?
        "rgba(255,255,255,0.03)" :
        "rgba(0,0,0,0.02)",
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: isDark ?
        "rgba(255,255,255,0.06)" :
        "rgba(0,0,0,0.05)",
        gap: 12
      }}>
      
      {bullets.map((b, idx) =>
      <View
        key={idx}
        style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        
          <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: `${b.color}18`,
            alignItems: "center",
            justifyContent: "center"
          }}>
          
            <Ionicons name={b.icon} size={14} color={b.color} />
          </View>
          <Text
          style={{
            flex: 1,
            fontSize: 13,
            color: c.foreground,
            lineHeight: 18
          }}>
          
            {b.text}
          </Text>
        </View>
      )}
    </View>);

}