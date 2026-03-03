/**
 * @fileoverview Animated toast notification component.
 * Renders at the top of the screen, slides in/out automatically.
 * Consumed via ToastContext — no user interaction required.
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../context/ToastContext";

const CONFIG = {
  success: {
    icon: "checkmark-circle",
    color: "#22C55E",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.3)",
  },
  error: {
    icon: "close-circle",
    color: "#F43F5E",
    bg: "rgba(244,63,94,0.12)",
    border: "rgba(244,63,94,0.3)",
  },
  info: {
    icon: "information-circle",
    color: "#6366F1",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.3)",
  },
};

export default function Toast() {
  const { toast, hideToast } = useToast();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [toast]);

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
            borderRadius: 16,
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
