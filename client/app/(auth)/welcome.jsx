import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, Text, View, Dimensions, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";

const { width, height } = Dimensions.get("window");

export default function Welcome() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const c = theme.colors;

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#08080c" : c.background }}>
      {}
      {isDark &&
      <>
          <View style={{ position: "absolute", top: -height * 0.1, right: -width * 0.2, width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: c.primary, opacity: 0.15, transform: [{ scale: 1.5 }] }} />
          <View style={{ position: "absolute", bottom: height * 0.1, left: -width * 0.3, width: width, height: width, borderRadius: width * 0.5, backgroundColor: "#6366F1", opacity: 0.1, transform: [{ scale: 1.2 }] }} />
        </>
      }

      {}
      <View style={{ flex: 1, paddingHorizontal: 32, paddingTop: 100, paddingBottom: 60, justifyContent: "space-between" }}>
        
        {}
        <View style={{ alignItems: "flex-start" }}>
          <Text style={{ color: c.foreground, fontSize: 24, fontWeight: "900", letterSpacing: 4 }}>
            NOVENCE
          </Text>
        </View>

        {}
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ color: c.foreground, fontSize: 52, fontWeight: "900", lineHeight: 54, letterSpacing: -1, marginBottom: 4 }}>
            {t("auth.welcomeTitle1")}
          </Text>
          <Text style={{ color: c.primary, fontSize: 52, fontWeight: "900", lineHeight: 54, letterSpacing: -1 }}>
            {t("auth.welcomeTitle2")}
          </Text>
          <Text style={{ color: c.textMuted, fontSize: 18, fontWeight: "500", lineHeight: 28, marginTop: 24, paddingRight: 20 }}>
            {t("auth.welcomeSubtitle")}
          </Text>
        </View>

        {}
        <View style={{ width: "100%", gap: 16 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(auth)/sign-up")}>
            
            <View
              style={{
                backgroundColor: c.primary,
                height: 60,
                width: "100%",
                borderRadius: 30,
                alignItems: "center",
                justifyContent: "center"
              }}>
              
              <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "800", letterSpacing: 0.5 }}>
                {t("auth.register")}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(auth)/sign-in")}>
            
            <View
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
                height: 60,
                width: "100%",
                borderRadius: 30,
                alignItems: "center",
                justifyContent: "center"
              }}>
              
              <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800" }}>
                {t("auth.login")}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>);

}