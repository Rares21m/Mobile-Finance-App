import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import SectionHeader from "../SectionHeader";

export default function BenefitSection({ accounts, isDark, c }) {
  const { t } = useTranslation();

  if (accounts.length > 0) return null;

  return (
    <View style={{ paddingTop: 32, paddingBottom: 8 }}>
      <View style={{ paddingHorizontal: 24 }}>
        <SectionHeader title={t("accounts.whyConnect")} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          gap: 12,
          paddingBottom: 4
        }}>
        
        {[
        {
          icon: "card-outline",
          titleKey: "accounts.benefitBalances",
          descKey: "accounts.benefitBalancesDesc",
          color: c.primary,
          gradientColors: isDark ?
          [c.primary + "28", c.primary + "08"] :
          [c.primary + "20", c.primary + "06"]
        },
        {
          icon: "swap-horizontal-outline",
          titleKey: "accounts.benefitTransactions",
          descKey: "accounts.benefitTransactionsDesc",
          color: "#8B5CF6",
          gradientColors: isDark ?
          ["rgba(139,92,246,0.22)", "rgba(139,92,246,0.06)"] :
          ["rgba(139,92,246,0.16)", "rgba(139,92,246,0.04)"]
        },
        {
          icon: "analytics-outline",
          titleKey: "accounts.benefitInsights",
          descKey: "accounts.benefitInsightsDesc",
          color: "#F59E0B",
          gradientColors: isDark ?
          ["rgba(245,158,11,0.22)", "rgba(245,158,11,0.06)"] :
          ["rgba(245,158,11,0.16)", "rgba(245,158,11,0.04)"]
        }].
        map((item) =>
        <LinearGradient
          key={item.icon}
          colors={item.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            width: 158,
            borderRadius: 20,
            padding: 18,
            borderWidth: 1,
            borderColor: item.color + "28"
          }}>
          
            <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: item.color + "1A",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14
            }}>
            
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <Text
            style={{
              color: c.foreground,
              fontWeight: "700",
              fontSize: 13,
              lineHeight: 18,
              marginBottom: 6
            }}>
            
              {t(item.titleKey)}
            </Text>
            <Text
            style={{
              color: c.textMuted,
              fontSize: 11,
              lineHeight: 16
            }}>
            
              {t(item.descKey)}
            </Text>
          </LinearGradient>
        )}
      </ScrollView>

      {}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 20,
          gap: 6
        }}>
        
        <Ionicons
          name="shield-checkmark-outline"
          size={14}
          color={c.textMuted} />
        
        <Text style={{ color: c.textMuted, fontSize: 12 }}>
          {t("accounts.psd2Security")}
        </Text>
      </View>
    </View>);

}