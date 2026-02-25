/**
 * @fileoverview Transaction row component displaying category icon,
 * description, date, and amount. Used in dashboard and analytics.
 */

import { Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { categorizeTransaction } from "../utils/categoryUtils";

/**
 * A single transaction row used in dashboard, accounts, and analytics.
 *
 * @param {object}  tx        - Transaction object from BankContext
 * @param {boolean} isLast    - Whether this is the last item (hides bottom border)
 * @param {boolean} [showCategory] - Show category label below the description
 */
export default function TransactionItem({ tx, isLast, showCategory = false }) {
    const { t } = useTranslation();
    const amount = parseFloat(tx.transactionAmount?.amount || 0);
    const isExpense = amount < 0;
    const cat = categorizeTransaction(tx);

    const description =
        tx.creditorName ||
        tx.debtorName ||
        tx.remittanceInformationUnstructured ||
        t("dashboard.transaction");

    const dateStr = tx.bookingDate
        ? new Date(tx.bookingDate).toLocaleDateString("ro-RO", {
            day: "numeric",
            month: "short",
        })
        : "";

    return (
        <View
            className={`flex-row items-center p-4 ${!isLast ? "border-b border-white/[0.04]" : ""
                }`}
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
                <Text
                    className="text-white font-medium text-sm"
                    numberOfLines={1}
                >
                    {description}
                </Text>
                <Text className="text-gray-600 text-xs mt-0.5">
                    {showCategory
                        ? `${t(`analytics.categories.${cat.key}`)} • ${dateStr}`
                        : dateStr}
                </Text>
            </View>

            {/* Amount */}
            <View className={showCategory ? "items-end ml-3" : ""}>
                <Text
                    className={`font-bold text-sm ${isExpense ? "text-expense" : "text-success"
                        }`}
                >
                    {isExpense ? "" : "+"}
                    {amount.toLocaleString("ro-RO", {
                        minimumFractionDigits: 2,
                    })}{" "}
                    <Text className="font-normal text-xs">
                        {tx.transactionAmount?.currency || t("common.currency")}
                    </Text>
                </Text>
                {showCategory && (
                    <Text className="text-gray-600 text-xs mt-0.5">
                        {tx.transactionAmount?.currency || t("common.currency")}
                    </Text>
                )}
            </View>
        </View>
    );
}
