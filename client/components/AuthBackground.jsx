/**
 * @fileoverview Shared gradient background with decorative circles and
 * optional back button, used by the sign-in and sign-up screens.
 */

import { Pressable, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTheme } from "../context/ThemeContext";








export default function AuthBackground({ children, showBack = true }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <LinearGradient
      colors={c.authBgGradient}
      style={{ flex: 1 }}>
      
            {}
            <View
        style={{
          position: "absolute",
          top: -100,
          right: -80,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: c.authDecorCircle1
        }} />
      
            <View
        style={{
          position: "absolute",
          bottom: 140,
          left: -70,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: c.authDecorCircle2
        }} />
      

            {}
            {showBack &&
      <Pressable
        className="absolute top-14 left-5 z-10 w-10 h-10 rounded-full bg-foreground/5 items-center justify-center active:opacity-70"
        onPress={() => router.back()}>
        
                    <Ionicons
          name="chevron-back"
          size={22}
          color={c.textMuted} />
        
                </Pressable>
      }

            {children}
        </LinearGradient>);

}