/**
 * @fileoverview Badge Earned celebration modal.
 * Shows an animated popup whenever the user earns a new badge.
 * Consumes the first item from BadgesContext.pendingBadges queue.
 */

import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Easing, Modal, Pressable, Text, View } from "react-native";
import { useBadges } from "../context/BadgesContext";
import { useTheme } from "../context/ThemeContext";

export default function BadgeEarnedModal() {
  const { pendingBadges, dismissPendingBadge } = useBadges();
  const { theme } = useTheme();
  const c = theme.colors;
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ro") ? "Ro" : "En";

  const badge = pendingBadges[0] || null;

  // Animations
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const sparkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!badge) return;
    // Reset
    scale.setValue(0.5);
    opacity.setValue(0);
    sparkle.setValue(0);

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkle, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 6 },
      ),
    ]).start();
  }, [badge?.id]);

  if (!badge) return null;

  const badgeName = badge[`name${lang}`] || badge.nameEn;
  const badgeDesc = badge[`desc${lang}`] || badge.descEn;

  const ringScale = sparkle.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const ringOpacity = sparkle.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0.15],
  });

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      {/* Backdrop */}
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.65)",
          alignItems: "center",
          justifyContent: "center",
        }}
        onPress={dismissPendingBadge}
      >
        <Animated.View
          style={{ transform: [{ scale }], opacity }}
          onStartShouldSetResponder={() => true}
        >
          <Pressable onPress={() => {}}>
            {/* Pulsing ring behind the emoji circle */}
            <Animated.View
              style={{
                position: "absolute",
                alignSelf: "center",
                top: 18,
                width: 100,
                height: 100,
                borderRadius: 50,
                borderWidth: 3,
                borderColor: badge.color,
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              }}
            />

            {/* Card */}
            <View
              style={{
                width: 300,
                borderRadius: 28,
                overflow: "hidden",
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              {/* Top gradient */}
              <LinearGradient
                colors={[badge.color + "22", badge.color + "06"]}
                style={{
                  alignItems: "center",
                  paddingTop: 32,
                  paddingBottom: 8,
                }}
              >
                {/* Emoji circle */}
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: badge.color + "22",
                    borderWidth: 2,
                    borderColor: badge.color + "55",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontSize: 38 }}>{badge.emoji}</Text>
                </View>

                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    color: badge.color,
                    marginBottom: 4,
                  }}
                >
                  Realizare deblocată!
                </Text>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "800",
                    color: c.text,
                    marginBottom: 6,
                  }}
                >
                  {badgeName}
                </Text>
              </LinearGradient>

              {/* Body */}
              <View
                style={{
                  paddingHorizontal: 24,
                  paddingTop: 12,
                  paddingBottom: 24,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: c.textMuted,
                    textAlign: "center",
                    lineHeight: 20,
                    marginBottom: 20,
                  }}
                >
                  {badgeDesc}
                </Text>

                {/* XP pill */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: badge.color + "18",
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 6,
                      borderWidth: 1,
                      borderColor: badge.color + "33",
                    }}
                  >
                    <Text style={{ fontSize: 18, marginRight: 6 }}>⚡</Text>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: badge.color,
                      }}
                    >
                      +{badge.points} XP
                    </Text>
                  </View>
                </View>

                {/* Dismiss button */}
                <Pressable
                  onPress={dismissPendingBadge}
                  style={{
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  <LinearGradient
                    colors={[badge.color, badge.color + "CC"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingVertical: 14, alignItems: "center" }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 16,
                        fontWeight: "700",
                      }}
                    >
                      Super! 🎉
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
