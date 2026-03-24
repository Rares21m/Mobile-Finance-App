import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";












export default function TrendComboChart({
  monthlyIncomeTrend,
  screenWidth,
  c,
  isDark,
  t
}) {
  if (!monthlyIncomeTrend || monthlyIncomeTrend.length === 0) return null;


  const groupedData = [];
  for (const month of monthlyIncomeTrend) {
    groupedData.push({
      value: month.income,
      label: month.label,
      frontColor: "#22C55E",
      gradientColor: "#16A34A",
      spacing: 4
    });
    groupedData.push({
      value: month.expenses,
      frontColor: "#F43F5E",
      gradientColor: "#E11D48",
      spacing: 16
    });
  }


  const monthsWithData = monthlyIncomeTrend.filter(
    (m) => m.income > 0 || m.expenses > 0
  );

  const bestMonth = monthsWithData.reduce(
    (best, m) =>
    m.income - m.expenses > (best ? best.income - best.expenses : -Infinity) ?
    m :
    best,
    null
  );

  const worstMonth = monthsWithData.reduce(
    (worst, m) =>
    m.income - m.expenses < (
    worst ? worst.income - worst.expenses : Infinity) ?
    m :
    worst,
    null
  );

  const avgSavings =
  monthsWithData.length > 0 ?
  Math.round(
    monthsWithData.reduce((s, m) => s + (m.income - m.expenses), 0) /
    monthsWithData.length
  ) :
  0;

  const kpis = [
  {
    icon: "trophy",
    color: "#10B981",
    label: t("analytics.trend.bestMonth"),
    value: bestMonth?.label || "—"
  },
  {
    icon: "alert-circle",
    color: "#F43F5E",
    label: t("analytics.trend.worstMonth"),
    value: worstMonth?.label || "—"
  },
  {
    icon: "trending-up",
    color: avgSavings >= 0 ? "#22C55E" : "#F43F5E",
    label: t("analytics.trend.avgSavings"),
    value: `${avgSavings >= 0 ? "+" : ""}${avgSavings.toLocaleString("ro-RO")}`
  }];


  return (
    <View>
      {}
      <View
        style={{
          backgroundColor: isDark ?
          "rgba(255,255,255,0.03)" :
          "rgba(0,0,0,0.02)",
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: isDark ?
          "rgba(255,255,255,0.06)" :
          "rgba(0,0,0,0.05)",
          marginBottom: 12
        }}>
        
        {}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: 16,
            marginBottom: 16
          }}>
          
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                backgroundColor: "#22C55E"
              }} />
            
            <Text style={{ fontSize: 11, color: c.textMuted }}>
              {t("analytics.income")}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                backgroundColor: "#F43F5E"
              }} />
            
            <Text style={{ fontSize: 11, color: c.textMuted }}>
              {t("analytics.expenses")}
            </Text>
          </View>
        </View>

        <BarChart
          data={groupedData}
          width={screenWidth - 110}
          height={160}
          barWidth={14}
          spacing={4}
          noOfSections={4}
          barBorderRadius={5}
          yAxisColor="transparent"
          xAxisColor={c.chartAxisColor || "transparent"}
          yAxisTextStyle={{
            color: c.chartAxisTextColor || c.textMuted,
            fontSize: 9
          }}
          xAxisLabelTextStyle={{
            color: c.chartAxisTextColor || c.textMuted,
            fontSize: 9
          }}
          hideRules
          isAnimated
          animationDuration={800} />
        
      </View>

      {}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {kpis.map((kpi) =>
        <View
          key={kpi.label}
          style={{
            flex: 1,
            backgroundColor: isDark ?
            "rgba(255,255,255,0.04)" :
            "rgba(0,0,0,0.03)",
            borderRadius: 16,
            padding: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: isDark ?
            "rgba(255,255,255,0.06)" :
            "rgba(0,0,0,0.05)"
          }}>
          
            <Ionicons
            name={kpi.icon}
            size={16}
            color={kpi.color}
            style={{ marginBottom: 6 }} />
          
            <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: c.foreground,
              marginBottom: 2
            }}>
            
              {kpi.value}
            </Text>
            <Text
            style={{
              fontSize: 9,
              color: c.textMuted,
              textAlign: "center"
            }}
            numberOfLines={1}>
            
              {kpi.label}
            </Text>
          </View>
        )}
      </View>
    </View>);

}