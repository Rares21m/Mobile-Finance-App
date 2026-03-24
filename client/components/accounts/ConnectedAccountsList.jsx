import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";

export default function ConnectedAccountsList({
  accounts,
  connections,
  getAccountBalance,
  BANK_CONFIG,
  activeBank,
  c
}) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  if (!activeBank) return null;

  const isConnected = connections.some(
    (conn) => conn.bankName === activeBank && conn.status === "active"
  );

  if (!isConnected) return null;

  const bankConnectionIds = connections.
  filter((conn) => conn.bankName === activeBank && conn.status === "active").
  map((conn) => conn.id);

  const bankAccounts = accounts.filter((acc) =>
  bankConnectionIds.includes(acc.connectionId)
  );

  if (bankAccounts.length === 0) return null;

  const cfg = BANK_CONFIG[activeBank] || {
    label: activeBank,
    color: c.accent,
    bgColor: "rgba(99,102,241,0.12)",
    initials: activeBank.slice(0, 3)
  };

  const bankTotal = bankAccounts.reduce((sum, acc) => {
    const bal = getAccountBalance(acc);
    return sum + (parseFloat(bal.amount) || 0);
  }, 0);

  const formatIban = (iban) => {
    if (!iban) return "";
    return iban.replace(/(.{4})/g, "$1 ").trim();
  };

  return (
    <View style={{ paddingHorizontal: 24, marginTop: 12 }}>
      {}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16
        }}>
        
        <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800" }}>
          {t("dashboard.accounts")}
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>
          {bankAccounts.length} {t("dashboard.accounts").toLowerCase()}
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        {bankAccounts.map((account, index) => {
          const bal = getAccountBalance(account);
          const amount = parseFloat(bal.amount) || 0;
          const contribution = bankTotal > 0 ? amount / bankTotal : 0;
          const rawType = account.cashAccountType || account.usage || null;
          const typeMap = {
            CACC: "CURENT",
            SVGS: "ECONOMII",
            TRAN: "PLĂȚI",
            LOAN: "CREDIT",
            MOMA: "MONEDĂ"
          };
          const accountTypeLabel = rawType ?
          typeMap[rawType] || rawType.slice(0, 5) :
          null;

          return (
            <View
              key={`${account.connectionId || ""}-${
              account.resourceId || index}`
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderRadius: 20,
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"
              }}>
              
              {}
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16
                }}>
                
                <Ionicons
                  name="wallet-outline"
                  size={20}
                  color={c.foreground} />
                
              </View>

              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 4
                  }}>
                  
                  <Text
                    style={{
                      color: c.foreground,
                      fontWeight: "700",
                      fontSize: 15,
                      flexShrink: 1
                    }}
                    numberOfLines={1}>
                    
                    {account.name || account.iban || `Cont ${activeBank}`}
                  </Text>
                  <View
                    style={{
                      backgroundColor: cfg.color + "20",
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2
                    }}>
                    
                    <Text
                      style={{
                        color: cfg.color,
                        fontSize: 9,
                        fontWeight: "800",
                        letterSpacing: 0.5
                      }}>
                      
                      {activeBank} {accountTypeLabel ? `• ${accountTypeLabel}` : ''}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    color: c.textMuted,
                    fontSize: 12,
                    fontWeight: "500",
                    marginBottom: 8
                  }}>
                  
                  {formatIban(account.iban)}
                </Text>

                {}
                <View
                  style={{
                    height: 4,
                    backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    borderRadius: 2,
                    overflow: "hidden"
                  }}>
                  
                  <View
                    style={{
                      width: `${Math.round(contribution * 100)}%`,
                      height: 4,
                      backgroundColor: cfg.color,
                      borderRadius: 2
                    }} />
                  
                </View>
              </View>

              <View
                style={{
                  alignItems: "flex-end",
                  marginLeft: 16,
                  justifyContent: "center"
                }}>
                
                <Text
                  style={{
                    color: c.foreground,
                    fontWeight: "800",
                    fontSize: 16
                  }}>
                  
                  {amount.toLocaleString("ro-RO", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Text>
                <Text
                  style={{
                    color: c.textMuted,
                    fontSize: 12,
                    fontWeight: "600",
                    marginTop: 4
                  }}>
                  
                  {bal.currency}
                </Text>
              </View>
            </View>);

        })}
      </View>
    </View>);

}