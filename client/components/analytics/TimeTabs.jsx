import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";










export default function TimeTabs({ activeTab, onTabChange, isDark, theme }) {
  const { t } = useTranslation();
  const c = theme.colors;

  const tabs = [
  { key: "past", label: t("analytics.activeViews.past") },
  { key: "present", label: t("analytics.activeViews.present") },
  { key: "future", label: t("analytics.activeViews.future") }];


  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
        borderRadius: 24,
        padding: 4,
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
        marginHorizontal: 24,
        marginTop: 12
      }}>
      
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 20,
              backgroundColor: isActive ?
              isDark ?
              "rgba(255,255,255,0.12)" :
              "rgba(255,255,255,1)" :
              "transparent",
              alignItems: "center",
              justifyContent: "center",

              ...(isActive && !isDark ?
              {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2
              } :
              {})
            }}>
            
            <Text
              style={{
                fontSize: 13,
                fontWeight: isActive ? "700" : "500",
                color: isActive ? c.foreground : c.textMuted
              }}>
              
              {tab.label}
            </Text>
          </Pressable>);

      })}
    </View>);

}