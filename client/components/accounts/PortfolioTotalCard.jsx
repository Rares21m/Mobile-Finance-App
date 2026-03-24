import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

export default function PortfolioTotalCard({
  accounts,
  connections,
  totalBalance,
  getAccountBalance,
  BANK_CONFIG,
  isDark,
  c
}) {
  const { t } = useTranslation();

  if (accounts.length === 0) return null;

  const connectedBankNames = [
  ...new Set(
    connections.
    filter((conn) => conn.status === "active").
    map((conn) => conn.bankName)
  )];


  return (
    <View style={{ marginHorizontal: 24, marginTop: 20 }}>
      <LinearGradient
        colors={isDark ? ["#1A2F2B", "#1D2940"] : ["#E6F5F1", "#EEF0FA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 24,
          padding: 22,
          borderWidth: 1,
          borderColor: c.primary + "28"
        }}>
        
        {}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6,
            gap: 8
          }}>
          
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: c.primary + "20",
              alignItems: "center",
              justifyContent: "center"
            }}>
            
            <Ionicons name="stats-chart" size={13} color={c.primary} />
          </View>
          <Text
            style={{
              color: c.textMuted,
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 0.5,
              textTransform: "uppercase"
            }}>
            
            {t("accounts.totalPortfolio")}
          </Text>
        </View>

        {}
        <Text
          style={{
            color: c.foreground,
            fontSize: 38,
            fontWeight: "900",
            letterSpacing: -1.5,
            lineHeight: 44
          }}>
          
          {totalBalance.toLocaleString("ro-RO", {
            minimumFractionDigits: 2
          })}
          <Text
            style={{
              fontSize: 16,
              fontWeight: "500",
              color: c.textMuted,
              letterSpacing: 0
            }}>
            
            {" "}
            {t("common.currency")}
          </Text>
        </Text>

        {}
        <View
          style={{
            height: 1,
            backgroundColor: c.border,
            marginVertical: 14,
            opacity: 0.6
          }} />
        

        {}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {connectedBankNames.map((bankName) => {
            const cfg = BANK_CONFIG[bankName];
            const bankConnectionIds = connections.
            filter(
              (conn) =>
              conn.bankName === bankName && conn.status === "active"
            ).
            map((conn) => conn.id);
            const bankTotal = accounts.
            filter((acc) => bankConnectionIds.includes(acc.connectionId)).
            reduce((sum, acc) => {
              const bal = getAccountBalance(acc);
              return sum + (parseFloat(bal.amount) || 0);
            }, 0);
            const pct =
            totalBalance > 0 ?
            Math.round(bankTotal / totalBalance * 100) :
            0;
            const chipColor = cfg?.color || c.accent;

            return (
              <View
                key={bankName}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: chipColor + "16",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  gap: 6,
                  borderWidth: 1,
                  borderColor: chipColor + "28"
                }}>
                
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: chipColor
                  }} />
                
                <Text
                  style={{
                    color: chipColor,
                    fontSize: 11,
                    fontWeight: "700"
                  }}>
                  
                  {bankName}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 11 }}>
                  {bankTotal.toLocaleString("ro-RO", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}{" "}
                  RON
                </Text>
                <View
                  style={{
                    backgroundColor: chipColor + "22",
                    borderRadius: 4,
                    paddingHorizontal: 4,
                    paddingVertical: 1
                  }}>
                  
                  <Text
                    style={{
                      color: chipColor,
                      fontSize: 9,
                      fontWeight: "700"
                    }}>
                    
                    {pct}%
                  </Text>
                </View>
              </View>);

          })}
        </View>
      </LinearGradient>
    </View>);

}