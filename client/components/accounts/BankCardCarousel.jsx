import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Text,
  View } from
"react-native";
import { useTheme } from "../../context/ThemeContext";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH - 56;
const CARD_GAP = 16;

export default function BankCardCarousel({
  BANKS,
  BANK_CONFIG,
  connections,
  trustByConnection,
  accounts,
  getAccountBalance,
  loading,
  pendingBank,
  startBTConnection,
  startBRDConnection,
  activeCardIndex,
  setActiveCardIndex,
  setDisconnectConfirm,
  c
}) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingLeft: 24,
          paddingRight: 24,
          gap: CARD_GAP
        }}
        onScroll={(e) => {
          const idx = Math.round(
            e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP)
          );
          setActiveCardIndex(idx);
        }}
        scrollEventThrottle={16}>
        
        {BANKS.map((bankKey) => {
          const cfg = BANK_CONFIG[bankKey];
          const isConnected = connections.some(
            (conn) => conn.bankName === bankKey && conn.status === "active"
          );
          const bankConnectionIds = connections.
          filter(
            (conn) => conn.bankName === bankKey && conn.status === "active"
          ).
          map((conn) => conn.id);
          const bankTrust = bankConnectionIds.
          map((id) => trustByConnection[id]).
          filter(Boolean);
          const bankOutdated = bankTrust.some((item) => item.dataMayBeOutdated);

          const bankHealthState = bankTrust.some(
            (item) => item.healthState === "expired"
          ) ?
          "expired" :
          bankTrust.some((item) => item.healthState === "degraded") ?
          "degraded" :
          "connected";

          const statusBg = !isConnected ?
          "transparent" :
          bankHealthState === "degraded" ?
          "rgba(245,158,11,0.20)" :
          bankHealthState === "expired" ?
          "rgba(244,63,94,0.20)" :
          "rgba(34,197,94,0.22)";

          const statusColor = !isConnected ?
          "transparent" :
          bankHealthState === "degraded" ?
          "#F59E0B" :
          bankHealthState === "expired" ?
          "#F43F5E" :
          "#22C55E";

          const statusLabel = !isConnected ?
          "" :
          bankHealthState === "degraded" ?
          t("accounts.healthDegraded") :
          bankHealthState === "expired" ?
          t("accounts.healthExpired") :
          t("accounts.connected");

          const bankAccounts = accounts.filter((acc) =>
          bankConnectionIds.includes(acc.connectionId)
          );
          const bankTotal = bankAccounts.reduce((sum, acc) => {
            const bal = getAccountBalance(acc);
            return sum + (parseFloat(bal.amount) || 0);
          }, 0);
          const isCardLoading = loading && pendingBank === bankKey;

          if (!isConnected) {

            return (
              <Pressable
                key={bankKey}
                onPress={isCardLoading ? undefined :
                bankKey === "BT" ? startBTConnection : startBRDConnection
                }
                style={({ pressed }) => ({
                  width: CARD_WIDTH,
                  height: 220,
                  borderRadius: 24,
                  borderWidth: 2,
                  borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
                  borderStyle: "dashed",
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 24,
                  opacity: pressed ? 0.7 : 1
                })}>
                
                {isCardLoading ?
                <ActivityIndicator color={c.primary} size="large" /> :

                <>
                    <View style={{
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    alignItems: "center", justifyContent: "center", marginBottom: 16
                  }}>
                      <Ionicons name="add" size={28} color={c.primary} />
                    </View>
                    <Image source={cfg.logo} style={{ width: 100, height: 30, opacity: 0.5, marginBottom: 12 }} resizeMode="contain" />
                    <Text style={{ color: c.textMuted, fontSize: 13, textAlign: "center", fontWeight: "600" }}>
                      {t("accounts.connectNow")} {cfg.label}
                    </Text>
                  </>
                }
              </Pressable>);

          }


          return (
            <LinearGradient
              key={bankKey}
              colors={cfg.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: CARD_WIDTH,
                height: 220,
                borderRadius: 24,
                padding: 24,
                overflow: "hidden",
                justifyContent: "space-between"
              }}>
              
              {}
              <Image
                source={cfg.logo}
                style={{
                  position: "absolute",
                  right: -40,
                  bottom: -40,
                  width: 240,
                  height: 240,
                  opacity: 0.08
                }}
                resizeMode="contain" />
              

              {}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start"
                }}>
                
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.95)",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8
                  }}>
                  
                  <Image
                    source={cfg.logo}
                    style={{ width: 70, height: 22 }}
                    resizeMode="contain" />
                  
                </View>

                {}
                <View
                  style={{
                    backgroundColor: statusBg,
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6
                  }}>
                  
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: statusColor
                    }} />
                  
                  <Text
                    style={{
                      color: statusColor,
                      fontSize: 11,
                      fontWeight: "700"
                    }}>
                    
                    {statusLabel}
                  </Text>
                </View>
              </View>

              {}
              <View>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 13,
                    fontWeight: "600",
                    marginBottom: 4
                  }}>
                  
                  {bankTotal >= 0 ? t("dashboard.totalBalance") : "Credit"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 32,
                      fontWeight: "900",
                      letterSpacing: -1
                    }}>
                    
                    {bankTotal.toLocaleString("ro-RO", {
                      minimumFractionDigits: 2
                    })}
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "500",
                        color: "rgba(255,255,255,0.7)"
                      }}>
                      
                      {" "}
                      RON
                    </Text>
                  </Text>

                  <Pressable
                    onPress={() => setDisconnectConfirm(bankKey)}
                    style={({ pressed }) => ({
                      width: 40,
                      height: 40,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255,255,255,0.15)",
                      borderRadius: 20,
                      opacity: pressed ? 0.7 : 1
                    })}>
                    
                    <Ionicons
                      name="unlink-outline"
                      size={18}
                      color="#fff" />
                    
                  </Pressable>
                </View>
                {bankOutdated &&
                <View
                  style={{
                    marginTop: 10,
                    alignSelf: "flex-start",
                    backgroundColor: "rgba(245,158,11,0.20)",
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4
                  }}>
                  
                    <Text
                    style={{
                      color: "#F59E0B",
                      fontSize: 11,
                      fontWeight: "700"
                    }}>
                    
                      {t("accounts.dataMayBeOutdated")}
                    </Text>
                  </View>
                }
              </View>
            </LinearGradient>);

        })}
      </ScrollView>

      {}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
          marginTop: 20
        }}>
        
        {BANKS.map((_, i) =>
        <View
          key={i}
          style={{
            width: activeCardIndex === i ? 24 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: activeCardIndex === i ? c.primary : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
          }} />

        )}
      </View>
    </View>);

}