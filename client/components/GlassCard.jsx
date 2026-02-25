/**
 * @fileoverview Frosted-glass card container using BlurView,
 * used as a wrapper in authentication screens.
 */

import { View } from "react-native";

import { BlurView } from "expo-blur";

/**
 * Frosted-glass card container used in auth screens.
 *
 * @param {ReactNode} children - Card content
 */
export default function GlassCard({ children }) {
    return (
        <BlurView
            intensity={20}
            tint="dark"
            className="rounded-3xl overflow-hidden"
        >
            <View className="bg-white/[0.04] p-7 rounded-3xl border border-white/[0.08]">
                {children}
            </View>
        </BlurView>
    );
}
