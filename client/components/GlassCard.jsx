/**
 * @fileoverview Frosted-glass card container using BlurView,
 * used as a wrapper in authentication screens.
 */

import { View } from "react-native";

import { BlurView } from "expo-blur";
import { useTheme } from "../context/ThemeContext";

/**
 * Frosted-glass card container used in auth screens.
 *
 * @param {ReactNode} children - Card content
 */
export default function GlassCard({
    children,
    variant = "default",
    intensity = 20,
    style,
    contentStyle,
}) {
    const { theme, tokens } = useTheme();
    const c = theme.colors;

    const VARIANT_MAP = {
        default: {
            bg: `${c.foreground}0D`,
            border: `${c.foreground}1A`,
        },
        subtle: {
            bg: `${c.foreground}08`,
            border: `${c.foreground}14`,
        },
        elevated: {
            bg: `${c.foreground}12`,
            border: `${c.primary}26`,
        },
    };

    const resolved = VARIANT_MAP[variant] || VARIANT_MAP.default;

    return (
        <BlurView
            intensity={intensity}
            tint={theme.mode === "dark" ? "dark" : "light"}
            style={[{ borderRadius: tokens.radius.xl, overflow: "hidden" }, style]}
        >
            <View
                style={[
                    {
                        backgroundColor: resolved.bg,
                        padding: 28,
                        borderRadius: tokens.radius.xl,
                        borderWidth: 1,
                        borderColor: resolved.border,
                    },
                    contentStyle,
                ]}
            >
                {children}
            </View>
        </BlurView>
    );
}
