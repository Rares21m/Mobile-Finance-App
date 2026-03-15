/**
 * @fileoverview Animated toast notification component.
 * Renders at the top of the screen, slides in/out automatically.
 * Consumed via ToastContext — no user interaction required.
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";

function withAlpha(color, alpha) {
  if (!color || typeof color !== "string") return `rgba(0,0,0,${alpha})`;
  if (color.startsWith("#") && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

export default function Toast() {
  const { toast, hideToast } = useToast();
  const { theme, tokens } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const CONFIG = {
    success: {
      icon: "checkmark-circle",
      color: c.success,
      bg: withAlpha(c.success, 0.12),
      border: withAlpha(c.success, 0.3),
    },
    error: {
      icon: "close-circle",
      color: c.expense,
      bg: withAlpha(c.expense, 0.12),
      border: withAlpha(c.expense, 0.3),
    },
    info: {
      icon: "information-circle",
      color: c.accent,
      bg: withAlpha(c.accent, 0.12),
      border: withAlpha(c.accent, 0.3),
    },
  };

  useEffect(() => {
    if (toast) {
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: tokens.motion.fast,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: tokens.motion.normal,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: tokens.motion.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [toast, tokens.motion.fast, tokens.motion.normal]);

  if (!toast && opacity._value === 0) return null;

  const cfg = CONFIG[toast?.type] || CONFIG.info;

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: insets.top + 8,
        left: 16,
        right: 16,
        zIndex: 9999,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <Pressable onPress={hideToast}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: cfg.bg,
            borderWidth: 1,
            borderColor: cfg.border,
            borderRadius: tokens.radius.lg,
            paddingVertical: 12,
            paddingHorizontal: 14,
            gap: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
          <Text
            style={{
              flex: 1,
              color: cfg.color,
              fontSize: 14,
              fontWeight: "500",
              lineHeight: 20,
            }}
          >
            {toast?.message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
