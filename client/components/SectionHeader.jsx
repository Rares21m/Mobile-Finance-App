/**
 * @fileoverview Uppercase section title with optional right-side action,
 * used across dashboard, accounts, analytics, and profile screens.
 */

import { Pressable, Text, View } from "react-native";

/**
 * Section header used across dashboard, accounts, analytics, and profile.
 *
 * @param {string}   title        - Section title
 * @param {string}   [rightText]  - Optional right-side text
 * @param {Function} [onPress]    - Optional onPress for the right text
 */
export default function SectionHeader({ title, rightText, onPress }) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <View
          style={{
            width: 3,
            height: 16,
            borderRadius: 2,
            backgroundColor: "#10B981",
            opacity: 0.9,
          }}
        />
        <Text
          className="text-foreground/80 text-sm font-semibold"
          style={{ letterSpacing: 0.2 }}
        >
          {title}
        </Text>
      </View>
      {rightText &&
        (onPress ? (
          <Pressable className="active:opacity-70" onPress={onPress}>
            <Text className="text-primary text-xs font-semibold">
              {rightText}
            </Text>
          </Pressable>
        ) : (
          <Text className="text-text-muted text-xs">{rightText}</Text>
        ))}
    </View>
  );
}
