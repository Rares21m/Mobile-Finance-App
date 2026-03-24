import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import ChartSkeleton from "./ChartSkeleton";

export default function CategoryBreakdownWithPie({
  categoryData,
  pieData,
  totalExpenses,
  shouldShowChartSkeleton,
  setSelectedCategory,
  c,
  isDark,
  t
}) {
  return (
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
        marginBottom: 16
      }}>
      
      <Text
        style={{
          color: c.foreground,
          fontWeight: "600",
          fontSize: 14,
          marginBottom: 16
        }}>
        
        {t("analytics.byCategory")}
      </Text>
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        {shouldShowChartSkeleton ?
        <ChartSkeleton isDark={isDark} height={180} /> :

        <PieChart
          data={pieData}
          donut
          radius={80}
          innerRadius={50}
          innerCircleColor={c.chartInnerCircle}
          centerLabelComponent={() =>
          <View style={{ alignItems: "center" }}>
                <Text
              style={{
                color: c.foreground,
                fontSize: 14,
                fontWeight: "700"
              }}>
              
                  {totalExpenses.toLocaleString("ro-RO", {
                maximumFractionDigits: 0
              })}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 10 }}>RON</Text>
              </View>
          } />

        }
      </View>
      {categoryData.map((cat, idx) =>
      <Pressable
        key={cat.key}
        onPress={() => setSelectedCategory?.(cat)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: isDark ?
          "rgba(255,255,255,0.06)" :
          "rgba(0,0,0,0.05)"
        }}>
        
          <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: `${cat.color}18`,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8
          }}>
          
            <Ionicons name={cat.icon} size={13} color={cat.color} />
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4
            }}>
            
              <Text
              style={{
                color: c.foreground,
                fontSize: 12,
                fontWeight: "500"
              }}>
              
                {t(`analytics.categories.${cat.key}`)}
              </Text>
              <Text
              style={{
                color: c.foreground,
                fontSize: 12,
                fontWeight: "600"
              }}>
              
                {cat.total.toLocaleString("ro-RO", {
                maximumFractionDigits: 0
              })}{" "}
                RON
              </Text>
            </View>
            <View
            style={{
              height: 5,
              borderRadius: 3,
              backgroundColor: isDark ?
              "rgba(255,255,255,0.06)" :
              "rgba(0,0,0,0.06)",
              overflow: "hidden"
            }}>
            
              <View
              style={{
                height: "100%",
                width: `${cat.percentage}%`,
                borderRadius: 3,
                backgroundColor: cat.color
              }} />
            
            </View>
          </View>
          <Text
          style={{
            color: c.textMuted,
            fontSize: 12,
            width: 36,
            textAlign: "right"
          }}>
          
            {cat.percentage}%
          </Text>
        </Pressable>
      )}
    </View>);

}