/**
 * @fileoverview Uppercase section title with optional right-side action,
 * used across dashboard, accounts, analytics, and profile screens.
 */

import { Pressable, Text, View } from "react-native";

/**
 * Section header used across dashboard, accounts, analytics, and profile.
 *
 * @param {string}   title        - Uppercase section title
 * @param {string}   [rightText]  - Optional right-side text
 * @param {Function} [onPress]    - Optional onPress for the right text
 */
export default function SectionHeader({ title, rightText, onPress }) {
    return (
        <View className="flex-row items-center justify-between mb-3">
            <Text
                className="text-gray-500 text-xs font-semibold uppercase"
                style={{ letterSpacing: 1.5 }}
            >
                {title}
            </Text>
            {rightText &&
                (onPress ? (
                    <Pressable className="active:opacity-70" onPress={onPress}>
                        <Text className="text-primary text-xs font-semibold">
                            {rightText}
                        </Text>
                    </Pressable>
                ) : (
                    <Text className="text-gray-600 text-xs">{rightText}</Text>
                ))}
        </View>
    );
}
