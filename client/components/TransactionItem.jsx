/**
 * @fileoverview Transaction row component displaying category icon,
 * description, date, and amount in a modern Neon Fintech style.
 */

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { categorizeTransaction } from "../utils/categoryUtils";

export default function TransactionItem({
  tx,
  isLast,
  showCategory = false,
  onLongPress
}) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const c = theme.colors;

  const rawAmount = parseFloat(tx.transactionAmount?.amount || 0);
  const isExpense = rawAmount < 0;
  const cat = categorizeTransaction(tx);

  const description = isExpense ?
  tx.creditorName ||
  tx.remittanceInformationUnstructured ||
  t("dashboard.transaction") :
  tx.debtorName ||
  tx.creditorName ||
  tx.remittanceInformationUnstructured ||
  t("dashboard.transaction");

  const dateStr = tx.bookingDate ?
  new Date(tx.bookingDate).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short"
  }) :
  "";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
      }}>
      
      {}
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
          marginRight: 16
        }}>
        
        <Ionicons name={cat.icon} size={20} color={c.foreground} />
      </View>

      {}
      <View style={{ flex: 1, justifyContent: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text
            numberOfLines={1}
            style={{ flex: 1, color: c.foreground, fontSize: 16, fontWeight: "700", marginBottom: 2 }}>
            
            {description}
          </Text>
        </View>
        <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "500" }}>
          {showCategory ?
          `${t(`analytics.categories.${cat.key}`)} • ${dateStr}` :
          dateStr}
        </Text>
      </View>

      {}
      <View style={{ alignItems: "flex-end", justifyContent: "center" }}>
        <Text style={{ fontWeight: "800", fontSize: 16, color: c.foreground }}>
          {isExpense ? "-" : "+"}
          {Math.abs(rawAmount).toLocaleString("ro-RO", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </Text>
        {tx.isManual &&
        <Text style={{ color: c.primary, fontSize: 10, fontWeight: "700", marginTop: 2 }}>
            {t("transactions.manual").toUpperCase()}
          </Text>
        }
      </View>
    </TouchableOpacity>);

}