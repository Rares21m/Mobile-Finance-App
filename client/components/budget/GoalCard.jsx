import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import ProgressBar from "./ProgressBar";

export default function GoalCard({ goal, onPress, c, t }) {
  const { isDark } = useTheme();

  const pct =
  goal.targetAmount > 0 ?
  Math.round(goal.savedAmount / goal.targetAmount * 100) :
  0;
  const isComplete = pct >= 100;

  const fmtDate = (d) => {
    const dt = new Date(d);
    return `${dt.getDate().toString().padStart(2, "0")}/${(dt.getMonth() + 1).toString().padStart(2, "0")}/${dt.getFullYear()}`;
  };

  return (
    <Pressable
      onPress={() => onPress(goal)}
      style={({ pressed }) => ({
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
        borderRadius: 24,
        padding: 20,
        marginBottom: 12,
        opacity: pressed ? 0.7 : 1,
        borderWidth: 1,
        borderColor: isComplete ? `${goal.color}30` : isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)",
        flexDirection: "row",
        alignItems: "center"
      })}>
      
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: `${goal.color}15`,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 16
        }}>
        
        <Ionicons name={goal.icon} size={24} color={goal.color} />
      </View>
      
      <View style={{ flex: 1 }}>
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
              fontWeight: "700",
              fontSize: 16,
              flexShrink: 1
            }}
            numberOfLines={1}>
            
            {goal.name}
          </Text>
          {goal.deadline &&
          <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: "700" }}>
                {fmtDate(goal.deadline)}
              </Text>
            </View>
          }
        </View>

        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 2 }}>
          <Text style={{ color: goal.color, fontWeight: "800", fontSize: 18 }}>
            {goal.savedAmount.toLocaleString("ro-RO", { minimumFractionDigits: 0 })}
          </Text>
          <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>
            / {goal.targetAmount.toLocaleString("ro-RO", { minimumFractionDigits: 0 })} {t("common.currency")}
          </Text>
        </View>

        <ProgressBar
          percentage={Math.min(pct, 100)}
          status={isComplete ? "ok" : pct >= 75 ? "warning" : "ok"}
          c={{ ...c, success: goal.color }}
          style={{ marginTop: 8 }} />
        
      </View>
    </Pressable>);

}