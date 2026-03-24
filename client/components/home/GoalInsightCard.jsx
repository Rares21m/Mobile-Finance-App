import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";

export default function GoalInsightCard({
  goal,
  totalIncome,
  totalExpenses,
  totalBudgeted,
  categoryBreakdown,
  lastMonthBreakdown,
  savingsGoals,
  c,
  t
}) {
  const { isDark } = useTheme();

  let icon = "bulb-outline";
  let accentColor = c.primary;
  let title = "";
  let body = null;

  if (goal === "savings") {
    icon = "wallet-outline";
    const rate =
    totalIncome > 0 ?
    Math.round((totalIncome - totalExpenses) / totalIncome * 100) :
    0;
    const barPct = Math.min(Math.max(rate, 0), 100);
    const isGood = rate >= 20;
    accentColor = isGood ? c.success : "#F59E0B";

    const activeGoals = (savingsGoals || []).filter(
      (g) => parseFloat(g.savedAmount) < parseFloat(g.targetAmount)
    );

    if (activeGoals.length > 0) {
      title = t("dashboard.goalInsight.savings.goalsTitle");
      body =
      <View>
          {activeGoals.slice(0, 3).map((g) => {
          const target = parseFloat(g.targetAmount);
          const saved = parseFloat(g.savedAmount);
          const pct =
          target > 0 ?
          Math.min(Math.round(saved / target * 100), 100) :
          0;
          const goalColor = g.color || "#10B981";
          return (
            <View key={g.id} style={{ marginBottom: 10 }}>
                <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6
                }}>
                
                  <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8
                  }}>
                  
                    <Ionicons
                    name={g.icon || "star-outline"}
                    size={13}
                    color={c.foreground} />
                  
                  </View>
                  <Text
                  style={{
                    color: c.foreground,
                    fontSize: 13,
                    fontWeight: "700",
                    flex: 1
                  }}>
                  
                    {g.name}
                  </Text>
                  <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "600" }}>
                    {saved.toLocaleString("ro-RO", {
                    minimumFractionDigits: 0
                  })}
                    {" / "}
                    {target.toLocaleString("ro-RO", {
                    minimumFractionDigits: 0
                  })}{" "}
                    RON
                  </Text>
                </View>
                <View
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                  overflow: "hidden"
                }}>
                
                  <View
                  style={{
                    height: 4,
                    width: `${pct}%`,
                    borderRadius: 2,
                    backgroundColor: goalColor
                  }} />
                
                </View>
                <Text
                style={{
                  color: goalColor,
                  fontSize: 11,
                  marginTop: 4,
                  fontWeight: "700",
                  textAlign: "right"
                }}>
                
                  {pct}%
                </Text>
              </View>);

        })}
          {totalIncome > 0 &&
        <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4 }}>
              {t("dashboard.goalInsight.savings.desc", {
            rate: Math.max(rate, 0)
          })}
            </Text>
        }
        </View>;

    } else {
      title = t("dashboard.goalInsight.savings.title");
      body =
      <View>
          <Text style={{ color: c.textMuted, fontSize: 13, marginBottom: 12, fontWeight: "500" }}>
            {t("dashboard.goalInsight.savings.desc", {
            rate: Math.max(rate, 0)
          })}
          </Text>
          <View
          style={{
            height: 5,
            borderRadius: 3,
            backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
            overflow: "hidden",
            marginBottom: 8
          }}>
          
            <View
            style={{
              height: 5,
              width: `${barPct}%`,
              borderRadius: 3,
              backgroundColor: accentColor
            }} />
          
          </View>
          <Text style={{ color: c.textMuted, fontSize: 12 }}>
            {t("dashboard.goalInsight.savings.tip")}
          </Text>
        </View>;

    }
  } else if (goal === "expense_control") {
    const top = categoryBreakdown[0];
    if (!top) return null;
    const lastMonthTop = lastMonthBreakdown.find((cat) => cat.key === top.key);
    const lastAmt = lastMonthTop?.total || 0;
    let trendKey = "same";
    let trendPct = 0;
    if (lastAmt > 0) {
      trendPct = Math.round((top.total - lastAmt) / lastAmt * 100);
      if (trendPct > 5) trendKey = "up";else
      if (trendPct < -5) trendKey = "down";
    }
    icon = "trending-up-outline";
    accentColor = trendKey === "up" ? c.expense : c.success;
    title = t("dashboard.goalInsight.expense_control.title");
    body =
    <View>
        <Text style={{ color: c.textMuted, fontSize: 13, marginBottom: 4 }}>
          {t("dashboard.goalInsight.expense_control.desc", {
          category: t(`analytics.categories.${top.key}`),
          amount: top.total.toLocaleString("ro-RO", {
            minimumFractionDigits: 2
          })
        })}
        </Text>
        <Text style={{ color: accentColor, fontSize: 12, fontWeight: "600" }}>
          {trendKey === "up" ?
        t("dashboard.goalInsight.expense_control.up", {
          pct: Math.abs(trendPct)
        }) :
        trendKey === "down" ?
        t("dashboard.goalInsight.expense_control.down", {
          pct: Math.abs(trendPct)
        }) :
        t("dashboard.goalInsight.expense_control.same")}
        </Text>
      </View>;

  } else if (goal === "investment") {
    const surplus = Math.max(totalIncome - totalExpenses - totalBudgeted, 0);
    icon = "podium-outline";
    accentColor = c.primary;
    title = t("dashboard.goalInsight.investment.title");
    body =
    <Text style={{ color: c.textMuted, fontSize: 13 }}>
        {t("dashboard.goalInsight.investment.desc", {
        amount: surplus.toLocaleString("ro-RO", { minimumFractionDigits: 2 })
      })}
      </Text>;

  } else if (goal === "debt_freedom") {
    const DISCRETIONARY = ["shopping", "entertainment", "other"];
    const discretionary = categoryBreakdown.
    filter((cat) => DISCRETIONARY.includes(cat.key)).
    reduce((s, cat) => s + cat.total, 0);
    icon = "cut-outline";
    accentColor = "#F59E0B";
    title = t("dashboard.goalInsight.debt_freedom.title");
    body =
    <Text style={{ color: c.textMuted, fontSize: 13 }}>
        {t("dashboard.goalInsight.debt_freedom.desc", {
        amount: discretionary.toLocaleString("ro-RO", {
          minimumFractionDigits: 2
        })
      })}
      </Text>;

  }

  if (!body) return null;

  return (
    <View
      style={{
        backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        borderRadius: 24,
        padding: 20,
        marginBottom: 8
      }}>
      
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
        
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12
          }}>
          
          <Ionicons name={icon} size={16} color={c.foreground} />
        </View>
        <Text style={{ color: c.foreground, fontWeight: "800", fontSize: 16 }}>
          {title}
        </Text>
      </View>
      {body}
    </View>);

}