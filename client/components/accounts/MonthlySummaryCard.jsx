import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import SectionHeader from "../SectionHeader";

export default function MonthlySummaryCard({
  transactions,
  monthlyTx,
  monthlyIncome,
  monthlyExpenses,
  c
}) {
  const { t } = useTranslation();

  if (transactions.length === 0) return null;

  const net = monthlyIncome - monthlyExpenses;
  const isPositive = net >= 0;
  const total = monthlyIncome + monthlyExpenses;
  const incomeRatio = total > 0 ? monthlyIncome / total : 0.5;

  return (
    <View style={{ paddingHorizontal: 24, marginTop: 28 }}>
      <SectionHeader title={t("dashboard.thisMonth")} />
      <View
        style={{
          backgroundColor: c.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: c.border,
          overflow: "hidden"
        }}>
        
        {}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: c.border
          }}>
          
          <Text
            style={{
              color: c.textMuted,
              fontSize: 12,
              fontWeight: "500"
            }}>
            
            {t("accounts.recentTransactions")}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: c.accent + "18",
              borderRadius: 8,
              paddingHorizontal: 9,
              paddingVertical: 5
            }}>
            
            <Ionicons name="receipt-outline" size={12} color={c.accent} />
            <Text
              style={{
                color: c.accent,
                fontSize: 12,
                fontWeight: "700"
              }}>
              
              {monthlyTx.length}
            </Text>
          </View>
        </View>

        {}
        <View style={{ flexDirection: "row", padding: 12, gap: 10 }}>
          {}
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(34,197,94,0.08)",
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: "rgba(34,197,94,0.18)"
            }}>
            
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                marginBottom: 10
              }}>
              
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "rgba(34,197,94,0.18)",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                
                <Ionicons name="arrow-down" size={12} color="#22C55E" />
              </View>
              <Text
                style={{
                  color: "#22C55E",
                  fontSize: 11,
                  fontWeight: "600"
                }}>
                
                {t("dashboard.income")}
              </Text>
            </View>
            <Text
              style={{
                color: "#22C55E",
                fontSize: 20,
                fontWeight: "800",
                letterSpacing: -0.5
              }}>
              
              +
              {monthlyIncome.toLocaleString("ro-RO", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </Text>
            <Text
              style={{
                color: "rgba(34,197,94,0.55)",
                fontSize: 10,
                marginTop: 2
              }}>
              
              RON
            </Text>
          </View>

          {}
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(244,63,94,0.08)",
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: "rgba(244,63,94,0.18)"
            }}>
            
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                marginBottom: 10
              }}>
              
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "rgba(244,63,94,0.18)",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                
                <Ionicons name="arrow-up" size={12} color="#F43F5E" />
              </View>
              <Text
                style={{
                  color: "#F43F5E",
                  fontSize: 11,
                  fontWeight: "600"
                }}>
                
                {t("dashboard.expenses")}
              </Text>
            </View>
            <Text
              style={{
                color: "#F43F5E",
                fontSize: 20,
                fontWeight: "800",
                letterSpacing: -0.5
              }}>
              
              -
              {monthlyExpenses.toLocaleString("ro-RO", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </Text>
            <Text
              style={{
                color: "rgba(244,63,94,0.55)",
                fontSize: 10,
                marginTop: 2
              }}>
              
              RON
            </Text>
          </View>
        </View>

        {}
        <View style={{ marginHorizontal: 14, marginBottom: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 7
            }}>
            
            <Text style={{ color: c.textMuted, fontSize: 11 }}>Net flow</Text>
            <Text
              style={{
                color: isPositive ? "#22C55E" : "#F43F5E",
                fontSize: 12,
                fontWeight: "700"
              }}>
              
              {isPositive ? "+" : ""}
              {net.toLocaleString("ro-RO", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}{" "}
              RON
            </Text>
          </View>
          <View
            style={{
              height: 5,
              backgroundColor: "rgba(244,63,94,0.25)",
              borderRadius: 4
            }}>
            
            <View
              style={{
                width: `${Math.round(incomeRatio * 100)}%`,
                height: 5,
                backgroundColor: "#22C55E",
                borderRadius: 4
              }} />
            
          </View>
        </View>
      </View>
    </View>);

}