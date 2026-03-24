import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useBudget } from "../../context/BudgetContext";
import { useTheme } from "../../context/ThemeContext";
import { CATEGORIES } from "../../utils/categoryUtils";
import ProgressBar from "./ProgressBar";

export default function BudgetItem({ categoryKey, onEdit, c, t }) {
  const { getBudgetStatus } = useBudget();
  const { isDark } = useTheme();

  const cat = CATEGORIES.find((x) => x.key === categoryKey);
  if (!cat) return null;
  const { spent, limit, percentage, status } = getBudgetStatus(categoryKey);
  const remaining = Math.max((limit ?? 0) - spent, 0);

  const statusColor =
  status === "over" ?
  c.expense :
  status === "warning" ?
  "#F59E0B" :
  c.success ?? "#10B981";


  return (
    <Pressable
      onPress={() => onEdit(cat)}
      style={({ pressed }) => ({
        paddingVertical: 14,
        paddingHorizontal: 8,

        borderBottomWidth: 1,
        borderBottomColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
        opacity: pressed ? 0.7 : 1,
        marginBottom: 4
      })}>
      
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: `${cat.color}15`,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14
          }}>
          
          <Ionicons name={cat.icon} size={22} color={cat.color} />
        </View>

        {}
        <View style={{ flex: 1, justifyContent: "center" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 2 }}>
            <Text
              style={{
                color: c.foreground,
                fontWeight: "700",
                fontSize: 16
              }}>
              
              {t(`analytics.categories.${categoryKey}`)}
            </Text>
            
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
              <Text style={{ color: c.foreground, fontWeight: "800", fontSize: 15 }}>
                {spent.toFixed(0)}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "600" }}>
                / {(limit ?? 0).toFixed(0)} {t("common.currency")}
              </Text>
            </View>
          </View>
          
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "500" }}>
              {status === "over" ?
              t("budget.overBudget", "Depășit") :
              status === "warning" ?
              "Se apropie de limită" :
              `${remaining.toFixed(0)} ramasi`}
            </Text>
            
            <Text style={{ color: statusColor, fontSize: 11, fontWeight: "800" }}>
              {percentage}%
            </Text>
          </View>

          {}
          <ProgressBar
            percentage={percentage}
            status={status}
            c={c}
            style={{ marginTop: 8 }} />
          
        </View>
      </View>
    </Pressable>);

}