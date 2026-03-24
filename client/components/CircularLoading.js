/**
 * @fileoverview Animated circular loading spinner displayed during
 * splash/startup while SecureStore is being checked for a saved JWT.
 */

import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Text } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";

const ICONS = [
{ name: "wallet", color: "#10B981" },
{ name: "card", color: "#6366F1" },
{ name: "cash-outline", color: "#22C55E" },
{ name: "trending-up", color: "#F59E0B" },
{ name: "business", color: "#818CF8" }];


export default function CircularLoading() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2400,
        useNativeDriver: true
      })
    ).start();
  }, []);

  const angleStep = 2 * Math.PI / ICONS.length;
  const radius = 60;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Animated.View
        style={{
          width: 160,
          height: 160,
          justifyContent: "center",
          alignItems: "center",
          transform: [
          {
            rotate: rotateAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "360deg"]
            })
          }]

        }}>
        
        {ICONS.map((icon, idx) => {
          const angle = idx * angleStep;
          return (
            <View
              key={idx}
              style={{
                position: "absolute",
                left: 80 + radius * Math.cos(angle) - 18,
                top: 80 + radius * Math.sin(angle) - 18,
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: `${icon.color}15`,
                alignItems: "center",
                justifyContent: "center"
              }}>
              
              <Ionicons
                name={icon.name}
                size={20}
                color={icon.color} />
              
            </View>);

        })}
      </Animated.View>
      <Text style={[styles.text, { color: c.textMuted }]}>{t("auth.syncingData")}</Text>
    </View>);

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  text: {
    marginTop: 32,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.3
  }
});