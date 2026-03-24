import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

export default function SessionExpiredBanner({ sessionExpired }) {
  const { t } = useTranslation();

  if (!sessionExpired) return null;

  return (
    <View
      style={{
        marginHorizontal: 24,
        marginTop: 8,
        backgroundColor: "rgba(244,63,94,0.12)",
        borderWidth: 1,
        borderColor: "rgba(244,63,94,0.3)",
        borderRadius: 12,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10
      }}>
      
      <Ionicons name="warning-outline" size={18} color="#F43F5E" />
      <Text style={{ color: "#F43F5E", fontSize: 13, flex: 1 }}>
        {t("accounts.sessionExpired")}
      </Text>
    </View>);

}