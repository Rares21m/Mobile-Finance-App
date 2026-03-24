import { View, Text } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

export default function BudgetDoughnut({ totalBudgeted, totalSpent, c, isDark, t }) {
  const size = 260;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safeToSpend = Math.max(totalBudgeted - totalSpent, 0);


  const percentSpent = totalBudgeted > 0 ? Math.min(totalSpent / totalBudgeted, 1) : 0;
  const strokeDashoffset = circumference - percentSpent * circumference;


  let startColor = "#10B981";
  let endColor = "#34D399";

  if (percentSpent > 0.9) {
    startColor = "#EF4444";
    endColor = "#F87171";
  } else if (percentSpent > 0.75) {
    startColor = "#F59E0B";
    endColor = "#FBBF24";
  }


  const trackColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)";

  return (
    <View style={{ alignItems: "center", justifyContent: "center", marginVertical: 32 }}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          <Defs>
            <LinearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={startColor} />
              <Stop offset="100%" stopColor={endColor} />
            </LinearGradient>
          </Defs>
          {}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="transparent" />
          
          {}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#progressGrad)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"

            transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          
        </Svg>

        {}
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
            {t("budget.safeToSpend", "Safe to Spend")}
          </Text>
          <Text style={{ color: c.foreground, fontSize: 38, fontWeight: "900", letterSpacing: -1 }}>
            {safeToSpend.toLocaleString("ro-RO", { maximumFractionDigits: 0 })}
            <Text style={{ fontSize: 18, color: c.textMuted, fontWeight: "600" }}>
              {" "}RON
            </Text>
          </Text>
          
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 12 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: c.textMuted, fontSize: 11 }}>Cheltuit</Text>
              <Text style={{ color: c.foreground, fontSize: 14, fontWeight: "700" }}>
                {totalSpent.toLocaleString("ro-RO", { maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={{ width: 1, height: 20, backgroundColor: c.border }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: c.textMuted, fontSize: 11 }}>Total Limită</Text>
              <Text style={{ color: c.foreground, fontSize: 14, fontWeight: "700" }}>
                {totalBudgeted.toLocaleString("ro-RO", { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>);

}