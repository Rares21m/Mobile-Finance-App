/**
 * @fileoverview Primary gradient action button used for Login, Register,
 * and Save actions across auth and profile screens.
 */

import { Pressable, Text } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

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
    colors = ["#10B981", "#059669"],
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            className="rounded-2xl overflow-hidden active:opacity-90"
        >
            <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                    paddingVertical: 16,
                    alignItems: "center",
                    borderRadius: 16,
                }}
            >
                <Text className="text-white font-bold text-base">{label}</Text>
            </LinearGradient>
        </Pressable>
    );
}
