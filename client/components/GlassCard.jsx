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
            tint="default"
            className="rounded-3xl overflow-hidden"
        >
            <View className="bg-foreground/5 p-7 rounded-3xl border border-foreground/10">
                {children}
            </View>
        </BlurView>
    );
}
