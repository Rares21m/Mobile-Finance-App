/**
 * @fileoverview Shared gradient background with decorative circles and
 * optional back button, used by the sign-in and sign-up screens.
 */

import { Pressable, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

/**
 * Shared background layout for all auth screens (sign-in, sign-up, welcome).
 * Provides the gradient background, decorative circles, and optional back button.
 *
 * @param {ReactNode} children       - Screen content
 * @param {boolean}   [showBack]     - Show back button (default: true)
 */
export default function AuthBackground({ children, showBack = true }) {
    return (
        <LinearGradient
            colors={["#0C0C14", "#0A1A14", "#0C0C14"]}
            style={{ flex: 1 }}
        >
            {/* Decorative shapes */}
            <View
                style={{
                    position: "absolute",
                    top: -100,
                    right: -80,
                    width: 260,
                    height: 260,
                    borderRadius: 130,
                    backgroundColor: "rgba(16,185,129,0.08)",
                }}
            />
            <View
                style={{
                    position: "absolute",
                    bottom: 140,
                    left: -70,
                    width: 220,
                    height: 220,
                    borderRadius: 110,
                    backgroundColor: "rgba(99,102,241,0.06)",
                }}
            />

            {/* Back button */}
            {showBack && (
                <Pressable
                    className="absolute top-14 left-5 z-10 w-10 h-10 rounded-full bg-white/5 items-center justify-center active:opacity-70"
                    onPress={() => router.back()}
                >
                    <Ionicons
                        name="chevron-back"
                        size={22}
                        color="#9CA3AF"
                    />
                </Pressable>
            )}

            {children}
        </LinearGradient>
    );
}
