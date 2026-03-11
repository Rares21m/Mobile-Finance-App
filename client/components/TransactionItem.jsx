/**
 * @fileoverview Transaction row component displaying category icon,
 * description, date, and amount. Used in dashboard and analytics.
 */

import { Pressable, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { categorizeTransaction } from "../utils/categoryUtils";
/**
 * A single transaction row used in dashboard, accounts, and analytics.
 *
 * @param {object}   tx             - Transaction object from BankContext
 * @param {boolean}  isLast         - Whether this is the last item (hides bottom border)
 * @param {boolean}  [showCategory] - Show category label below the description
 * @param {Function} [onLongPress]  - Called when the row is long-pressed (for category override / edit)
 */
export default function TransactionItem({
  tx,
  isLast,
  showCategory = false,
  onLongPress,
}) {
  const { t } = useTranslation();

  const rawAmount = parseFloat(tx.transactionAmount?.amount || 0);
  const isExpense = rawAmount < 0;
  const cat = categorizeTransaction(tx);

  // For expenses: show who was paid (creditorName)
  // For income: show who sent the money (debtorName)
  const description = isExpense
    ? tx.creditorName ||
      tx.remittanceInformationUnstructured ||
      t("dashboard.transaction")
    : tx.debtorName ||
      tx.creditorName ||
      tx.remittanceInformationUnstructured ||
      t("dashboard.transaction");

  const dateStr = tx.bookingDate
    ? new Date(tx.bookingDate).toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "short",
      })
    : "";

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={400}
      className={`flex-row items-center p-4 ${!isLast ? "border-b border-border" : ""}`}
    >
      {/* Category icon */}
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: `${cat.color}18` }}
      >
        <Ionicons name={cat.icon} size={18} color={cat.color} />
      </View>

      {/* Description + date */}
      <View className="flex-1">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text
            className="text-foreground font-medium text-sm"
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {description}
          </Text>
          {tx.isManual && (
            <View
              style={{
                backgroundColor: "#6366F118",
                borderRadius: 6,
                paddingHorizontal: 5,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{ color: "#6366F1", fontSize: 9, fontWeight: "700" }}
              >
                {t("transactions.manual")}
              </Text>
            </View>
          )}
        </View>
        <Text className="text-text-muted text-xs mt-0.5">
          {showCategory
            ? `${t(`analytics.categories.${cat.key}`)} • ${dateStr}`
            : dateStr}
        </Text>
      </View>

      {/* Amount */}
      <Text
        className={`font-bold text-sm ${isExpense ? "text-expense" : "text-success"}`}
      >
        {isExpense ? "" : "+"}
        {Math.abs(rawAmount).toLocaleString("ro-RO", {
          minimumFractionDigits: 2,
        })}{" "}
        <Text className="font-normal text-xs">RON</Text>
      </Text>
    </Pressable>
  );
}
