import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import ProgressBar from "./ProgressBar";

export default function EventBudgetItem({
  budget,
  onEdit,
  getStatus,
  c,
  t
}) {
  const { isDark } = useTheme();
  const st = getStatus(budget);

  const statusColor =
  st.status === "over" || st.status === "expired" ?
  c.expense :
  st.status === "warning" ?
  "#F59E0B" :
  c.success ?? "#10B981";

  const statusLabel =
  st.status === "expired" ?
  t("budget.expired") :
  st.status === "over" ?
  t("budget.overBudget") :
  st.status === "upcoming" ?
  t("budget.upcoming") :
  t("budget.daysLeft", { count: st.daysLeft });

  const fmtDate = (d) => {
    const dt = new Date(d);
    return `${dt.getDate().toString().padStart(2, "0")}/${(dt.getMonth() + 1).toString().padStart(2, "0")}`;
  };

  return (
    <Pressable
      onPress={() => onEdit(budget)}
      style={({ pressed }) => ({
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
        borderRadius: 24,
        padding: 20,
        marginBottom: 12,
        opacity: pressed ? 0.7 : st.status === "expired" ? 0.5 : 1,

        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)"
      })}>
      
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 16
          }}>
          
          <Ionicons name="calendar" size={22} color={c.primary} />
        </View>
        
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: c.foreground, fontWeight: "700", fontSize: 16, marginBottom: 2 }}>
            
            {budget.name}
          </Text>
          <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "500" }}>
            {fmtDate(budget.startDate)} – {fmtDate(budget.endDate)} • {statusLabel}
          </Text>
        </View>
      </View>
      
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }}>
        <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "600" }}>
          {t("budget.spent", "Cheltuit")}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
          <Text style={{ color: statusColor, fontWeight: "800", fontSize: 18 }}>
            {st.spent.toLocaleString("ro-RO", { maximumFractionDigits: 0 })}
          </Text>
          <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>
            / {budget.totalLimit.toLocaleString("ro-RO", { maximumFractionDigits: 0 })} {t("common.currency")}
          </Text>
        </View>
      </View>

      <ProgressBar
        percentage={st.percentage}
        status={st.status === "expired" ? "ok" : st.status}
        c={c}
        style={{ marginTop: 4, marginBottom: 0 }} />
      
    </Pressable>);

}