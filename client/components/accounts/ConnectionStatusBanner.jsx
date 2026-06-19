import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

export default function ConnectionStatusBanner({
  hasOutdatedData,
  hasDegradedHealth,
  hasSandboxUnavailable,
  c
}) {
  const { t } = useTranslation();

  if (!hasOutdatedData && !hasDegradedHealth && !hasSandboxUnavailable) {
    return null;
  }

  const title = hasSandboxUnavailable ?
  t("accounts.sandboxUnavailableTitle") :
  t("accounts.dataMayBeOutdated");
  const description = hasSandboxUnavailable ?
  t("accounts.sandboxUnavailableDesc") :
  hasDegradedHealth ?
  t("accounts.healthDegraded") :
  t("accounts.connectionWarning");
  const accentColor = hasSandboxUnavailable || hasOutdatedData ?
  "#F59E0B" :
  "#3B82F6";

  return (
    <View
      style={{
        marginHorizontal: 24,
        marginTop: 8,
        backgroundColor: hasSandboxUnavailable || hasOutdatedData ?
        "rgba(245,158,11,0.12)" :
        "rgba(59,130,246,0.10)",
        borderWidth: 1,
        borderColor: hasSandboxUnavailable || hasOutdatedData ?
        "rgba(245,158,11,0.35)" :
        "rgba(59,130,246,0.30)",
        borderRadius: 12,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10
      }}>
      
      <Ionicons
        name={hasSandboxUnavailable ? "cloud-offline-outline" : hasOutdatedData ? "time-outline" : "sync-outline"}
        size={18}
        color={accentColor} />
      
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: accentColor,
            fontSize: 12,
            fontWeight: "600"
          }}>
          
          {title}
        </Text>
        <Text
          style={{
            color: c.textMuted,
            fontSize: 12,
            marginTop: 2
          }}>
          
          {description}
        </Text>
      </View>
    </View>);

}
