import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

export default function DisconnectConfirmationModal({
  disconnectConfirm,
  setDisconnectConfirm,
  disconnecting,
  handleDisconnect,
  c
}) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={!!disconnectConfirm}
      transparent
      animationType="fade"
      onRequestClose={() => !disconnecting && setDisconnectConfirm(null)}>
      
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32
        }}>
        
        <View
          style={{
            backgroundColor: c.card,
            borderRadius: 20,
            padding: 24,
            width: "100%",
            borderWidth: 1,
            borderColor: c.border
          }}>
          
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "rgba(244,63,94,0.12)",
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "center",
              marginBottom: 16
            }}>
            
            <Ionicons name="unlink-outline" size={24} color="#F43F5E" />
          </View>
          <Text
            style={{
              color: c.foreground,
              fontSize: 17,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: 8
            }}>
            
            {t("accounts.disconnectTitle", { bank: disconnectConfirm })}
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontSize: 13,
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 24
            }}>
            
            {t("accounts.disconnectDesc")}
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => setDisconnectConfirm(null)}
              disabled={disconnecting}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 13,
                borderRadius: 12,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
                alignItems: "center",
                opacity: pressed ? 0.7 : 1
              })}>
              
              <Text
                style={{
                  color: c.foreground,
                  fontWeight: "600",
                  fontSize: 14
                }}>
                
                {t("common.cancel")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleDisconnect(disconnectConfirm)}
              disabled={disconnecting}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 13,
                borderRadius: 12,
                backgroundColor: "rgba(244,63,94,0.15)",
                borderWidth: 1,
                borderColor: "rgba(244,63,94,0.35)",
                alignItems: "center",
                opacity: pressed || disconnecting ? 0.7 : 1
              })}>
              
              {disconnecting ?
              <ActivityIndicator size="small" color="#F43F5E" /> :

              <Text
                style={{
                  color: "#F43F5E",
                  fontWeight: "700",
                  fontSize: 14
                }}>
                
                  {t("accounts.disconnectConfirm")}
                </Text>
              }
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>);

}