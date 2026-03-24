import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

export default function ConnectionStatusBanner({
  hasOutdatedData,
  hasDegradedHealth,
  c
}) {
  const { t } = useTranslation();

  if (!hasOutdatedData && !hasDegradedHealth) return null;

  return (
    <View
      style={{
        marginHorizontal: 24,
        marginTop: 8,
        backgroundColor: hasOutdatedData ?
        "rgba(245,158,11,0.12)" :
        "rgba(59,130,246,0.10)",
        borderWidth: 1,
        borderColor: hasOutdatedData ?
        "rgba(245,158,11,0.35)" :
        "rgba(59,130,246,0.30)",
        borderRadius: 12,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10
      }}>
      
      <Ionicons
        name={hasOutdatedData ? "time-outline" : "sync-outline"}
        size={18}
        color={hasOutdatedData ? "#F59E0B" : "#3B82F6"} />
      
      <View style={{ flex: 1 }}>
        {hasOutdatedData ?
        <Text
          style={{
            color: hasOutdatedData ? "#F59E0B" : "#3B82F6",
            fontSize: 12,
            fontWeight: "600"
          }}>
          
            {t("accounts.dataMayBeOutdated")}
          </Text> :
        null}
        <Text
          style={{
            color: c.textMuted,
            fontSize: 12,
            marginTop: hasOutdatedData ? 2 : 0
          }}>
          
          {hasDegradedHealth ?
          t("accounts.healthDegraded") :
          t("accounts.connectionWarning")}
        </Text>
      </View>
    </View>);

}