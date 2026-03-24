import { Ionicons } from "@expo/vector-icons";
import { Dimensions, Text, View } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function BudgetVsActualCard({ budgetVsActualData, c, isDark, t }) {
  if (!budgetVsActualData || budgetVsActualData.length === 0) {
    return (
      <View
        style={{
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: isDark ?
          "rgba(255,255,255,0.10)" :
          "rgba(0,0,0,0.08)"
        }}>
        
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text
              style={{
                color: c.foreground,
                fontWeight: "600",
                fontSize: 14,
                marginBottom: 4
              }}>
              
              {t("analytics.budgetVsActual.emptyTitle")}
            </Text>
            <Text
              style={{
                color: c.textMuted,
                fontSize: 12,
                lineHeight: 16
              }}>
              
              {t("analytics.budgetVsActual.emptyDesc")}
            </Text>
          </View>
          <Ionicons
            name="git-compare-outline"
            size={36}
            color={c.textMuted} />
          
        </View>
      </View>);

  }

  const totalLimit = budgetVsActualData.reduce(
    (s, b) => s + (b.limit || 0),
    0
  );
  const totalSpent = budgetVsActualData.reduce((s, b) => s + b.spent, 0);
  const overallPct =
  totalLimit > 0 ? Math.min(totalSpent / totalLimit * 100, 100) : 0;
  const overallStatus =
  overallPct >= 100 ? "over" : overallPct >= 75 ? "warning" : "ok";
  const overallColor =
  overallStatus === "over" ?
  "#F43F5E" :
  overallStatus === "warning" ?
  "#F59E0B" :
  "#22C55E";

  return (
    <>
      {}
      <View
        style={{
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          backgroundColor: isDark ?
          "rgba(99,102,241,0.08)" :
          "rgba(99,102,241,0.05)",
          borderWidth: 1,
          borderColor: isDark ?
          "rgba(99,102,241,0.20)" :
          "rgba(99,102,241,0.12)"
        }}>
        
        <Text
          style={{ color: c.textMuted, fontSize: 12, marginBottom: 12 }}>
          
          {t("analytics.budgetVsActual.title")}
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 12
          }}>
          
          <View>
            <Text
              style={{ color: c.textMuted, fontSize: 10, marginBottom: 2 }}>
              
              {t("analytics.budgetVsActual.totalPlanned")}
            </Text>
            <Text
              style={{
                color: c.foreground,
                fontWeight: "700",
                fontSize: 20
              }}>
              
              {totalLimit.toLocaleString("ro-RO", {
                maximumFractionDigits: 0
              })}{" "}
              RON
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{ color: c.textMuted, fontSize: 10, marginBottom: 2 }}>
              
              {t("analytics.budgetVsActual.totalSpent")}
            </Text>
            <Text
              style={{
                fontWeight: "700",
                fontSize: 20,
                color: overallColor
              }}>
              
              {totalSpent.toLocaleString("ro-RO", {
                maximumFractionDigits: 0
              })}{" "}
              RON
            </Text>
          </View>
        </View>
        <View
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: isDark ?
            "rgba(255,255,255,0.06)" :
            "rgba(0,0,0,0.06)",
            overflow: "hidden",
            marginBottom: 4
          }}>
          
          <View
            style={{
              height: "100%",
              width: `${overallPct}%`,
              borderRadius: 4,
              backgroundColor: overallColor
            }} />
          
        </View>
        <Text style={{ color: c.textMuted, fontSize: 11 }}>
          {Math.round(overallPct)}% {t("budget.ofTotalBudget")}
        </Text>
      </View>

      {}
      <View
        style={{
          borderRadius: 20,
          overflow: "hidden",
          backgroundColor: isDark ?
          "rgba(255,255,255,0.03)" :
          "rgba(0,0,0,0.02)",
          borderWidth: 1,
          borderColor: isDark ?
          "rgba(255,255,255,0.06)" :
          "rgba(0,0,0,0.05)"
        }}>
        
        {}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 8,
            gap: 16
          }}>
          
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor: isDark ?
                "rgba(148,163,184,0.30)" :
                "rgba(148,163,184,0.40)"
              }} />
            
            <Text style={{ color: c.textMuted, fontSize: 12 }}>
              {t("analytics.budgetVsActual.planned")}
            </Text>
          </View>
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor: "#6366F1"
              }} />
            
            <Text style={{ color: c.textMuted, fontSize: 12 }}>
              {t("analytics.budgetVsActual.spent")}
            </Text>
          </View>
        </View>

        {budgetVsActualData.map((item, idx) => {
          const limit = item.limit || 0;
          const spent = item.spent;
          const pct =
          limit > 0 ? Math.min(spent / limit * 100, 100) : 0;
          const statusColor =
          item.status === "over" ?
          "#F43F5E" :
          item.status === "warning" ?
          "#F59E0B" :
          "#22C55E";
          const barWidth = SCREEN_WIDTH - 48 - 32 - 56;
          return (
            <View
              key={item.key}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderTopWidth: idx > 0 ? 1 : 0,
                borderTopColor: isDark ?
                "rgba(255,255,255,0.06)" :
                "rgba(0,0,0,0.05)"
              }}>
              
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8
                }}>
                
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: `${item.color}18`,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8
                  }}>
                  
                  <Ionicons
                    name={item.icon}
                    size={13}
                    color={item.color} />
                  
                </View>
                <Text
                  style={{
                    color: c.foreground,
                    fontSize: 12,
                    fontWeight: "600",
                    flex: 1
                  }}>
                  
                  {t(`analytics.categories.${item.key}`)}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor:
                    item.status === "over" ?
                    "rgba(244,63,94,0.12)" :
                    item.status === "warning" ?
                    "rgba(245,158,11,0.12)" :
                    "rgba(34,197,94,0.12)"
                  }}>
                  
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: statusColor
                    }}>
                    
                    {item.status === "over" ?
                    t("analytics.budgetVsActual.overBudget") :
                    `${item.percentage}%`}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                  gap: 8
                }}>
                
                <View
                  style={{
                    width: barWidth,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: isDark ?
                    "rgba(148,163,184,0.15)" :
                    "rgba(148,163,184,0.25)"
                  }}>
                  
                  <View
                    style={{
                      height: "100%",
                      width: "100%",
                      borderRadius: 4,
                      backgroundColor: isDark ?
                      "rgba(148,163,184,0.25)" :
                      "rgba(148,163,184,0.35)"
                    }} />
                  
                </View>
                <Text
                  style={{ color: c.textMuted, fontSize: 10 }}>
                  
                  {limit.toLocaleString("ro-RO", {
                    maximumFractionDigits: 0
                  })}{" "}
                  RON
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8
                }}>
                
                <View
                  style={{
                    width: barWidth,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: `${statusColor}20`,
                    overflow: "hidden"
                  }}>
                  
                  <View
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      borderRadius: 4,
                      backgroundColor: statusColor
                    }} />
                  
                </View>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "600",
                    color: statusColor
                  }}>
                  
                  {spent.toLocaleString("ro-RO", {
                    maximumFractionDigits: 0
                  })}{" "}
                  RON
                </Text>
              </View>
            </View>);

        })}
      </View>
    </>);

}