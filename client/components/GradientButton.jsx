/**
 * @fileoverview Primary gradient action button used for Login, Register,
 * and Save actions across auth and profile screens.
 */

import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text } from "react-native";
import { useTheme } from "../context/ThemeContext";

/**
 * Gradient button used in auth and profile screens.
 *
 * @param {string}   label       - Button text
 * @param {Function} onPress     - Press handler
 * @param {boolean}  [disabled]  - Disable the button
 * @param {string[]} [colors]    - Gradient colors (default: emerald)
 */
export default function GradientButton({
    label,
    onPress,
    disabled = false,
    loading = false,
    variant = "primary",
    size = "md",
    fullWidth = true,
    colors,
    style,
    textStyle,
}) {
    const { theme, tokens } = useTheme();
    const c = theme.colors;

    const SIZE_MAP = {
        sm: { py: 12, fontSize: tokens.typography.sizes.sm },
        md: { py: 16, fontSize: tokens.typography.sizes.md },
        lg: { py: 18, fontSize: tokens.typography.sizes.lg },
    };

    const VARIANT_MAP = {
        primary: [c.primary, c.primaryDark],
        accent: [c.accent, c.primary],
        success: [c.success, c.primaryDark],
        danger: [c.expense, c.expense],
    };

    const resolvedSize = SIZE_MAP[size] || SIZE_MAP.md;
    const resolvedColors = colors || VARIANT_MAP[variant] || VARIANT_MAP.primary;
    const isDisabled = disabled || loading;

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            style={({ pressed }) => ({
                opacity: isDisabled ? 0.6 : pressed ? 0.9 : 1,
                width: fullWidth ? "100%" : undefined,
                borderRadius: tokens.radius.lg,
                overflow: "hidden",
            })}
        >
            <LinearGradient
                colors={resolvedColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                    {
                        paddingVertical: resolvedSize.py,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: tokens.radius.lg,
                    },
                    style,
                ]}
            >
                <Text
                    style={[
                        {
                            color: c.textInverse,
                            fontWeight: "700",
                            fontSize: resolvedSize.fontSize,
                        },
                        textStyle,
                    ]}
                >
                    {loading ? "..." : label}
                </Text>
            </LinearGradient>
        </Pressable>
    );
}
