import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 200;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function scoreColor(score) {
  if (score >= 80) return ["#10B981", "#059669"];
  if (score >= 65) return ["#22C55E", "#16A34A"];
  if (score >= 50) return ["#F59E0B", "#D97706"];
  if (score >= 35) return ["#F97316", "#EA580C"];
  return ["#F43F5E", "#E11D48"];
}

function gradeEmoji(grade) {
  const map = { A: "🏆", B: "👍", C: "👌", D: "⚠️", F: "🔴" };
  return map[grade] || "📊";
}











export default function HealthScoreRing({ healthScore, onDrillDown, c, isDark, t }) {
  const animValue = useRef(new Animated.Value(0)).current;
  const { score, grade, components } = healthScore;
  const [color1, color2] = scoreColor(score);

  useEffect(() => {
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: score / 100,
      duration: 1200,
      useNativeDriver: true
    }).start();
  }, [score]);

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0]
  });

  const gauges = [
  {
    key: "savings",
    label: t("analytics.health.savings"),
    pts: components.savingsRate.points,
    max: components.savingsRate.max,
    icon: "wallet-outline",
    color: "#10B981"
  },
  {
    key: "budget",
    label: t("analytics.health.budget"),
    pts: components.budgetAdherence.points,
    max: components.budgetAdherence.max,
    icon: "shield-checkmark-outline",
    color: "#3B82F6"
  },
  {
    key: "diversity",
    label: t("analytics.health.diversity"),
    pts: components.spendingDiversity.points,
    max: components.spendingDiversity.max,
    icon: "pie-chart-outline",
    color: "#8B5CF6"
  },
  {
    key: "trend",
    label: t("analytics.health.trend"),
    pts: components.monthlyTrend.points,
    max: components.monthlyTrend.max,
    icon: "trending-up-outline",
    color: "#F59E0B"
  }];


  return (
    <Pressable
      onPress={onDrillDown}
      style={{
        alignItems: "center",
        paddingVertical: 8
      }}>
      
      {}
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: c.foreground,
          marginBottom: 16,
          alignSelf: "flex-start",
          marginLeft: 4
        }}>
        
        {t("analytics.health.title")}
      </Text>

      {}
      <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
        <Svg width={SIZE} height={SIZE} style={{ position: "absolute" }}>
          <Defs>
            <SvgGrad id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={color1} />
              <Stop offset="100%" stopColor={color2} />
            </SvgGrad>
          </Defs>
          {}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
            strokeWidth={STROKE}
            fill="none" />
          
          {}
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="url(#scoreGrad)"
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90, ${SIZE / 2}, ${SIZE / 2})`} />
          
        </Svg>

        {}
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 56, fontWeight: "800", color: color1 }}>
            {score}
          </Text>
        </View>
      </View>

      {}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          width: "100%",
          marginTop: 16,
          gap: 8
        }}>
        
        {gauges.map((g) => {
          const pct = g.max > 0 ? Math.round(g.pts / g.max * 100) : 0;
          return (
            <View
              key={g.key}
              style={{
                flex: 1,
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                borderRadius: 16,
                padding: 12,
                alignItems: "center",
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"
              }}>
              
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: `${g.color}18`,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 6
                }}>
                
                <Ionicons name={g.icon} size={16} color={g.color} />
              </View>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: g.color
                }}>
                
                {pct}%
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  color: c.textMuted,
                  marginTop: 2,
                  textAlign: "center"
                }}
                numberOfLines={1}>
                
                {g.label}
              </Text>
            </View>);

        })}
      </View>
    </Pressable>);

}