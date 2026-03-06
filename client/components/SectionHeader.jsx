/**
 * @fileoverview Uppercase section title with optional right-side action,
 * used across dashboard, accounts, analytics, and profile screens.
 */

import { Pressable, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

/**
 * Section header used across dashboard, accounts, analytics, and profile.
 *
 * @param {string}   title        - Section title
 * @param {string}   [rightText]  - Optional right-side text
 * @param {Function} [onPress]    - Optional onPress for the right text
 */
export default function SectionHeader({ title, rightText, onPress }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            width: 3,
            height: 16,
            borderRadius: 2,
            backgroundColor: c.primary,
          }}
        />
        <Text
          style={{
            color: c.foreground,
            fontSize: 13,
            fontWeight: "600",
            letterSpacing: 0.2,
          }}
        >
          {title}
        </Text>
      </View>
      {rightText &&
        (onPress ? (
          <Pressable
            onPress={onPress}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={{ color: c.primary, fontSize: 12, fontWeight: "600" }}>
              {rightText}
            </Text>
          </Pressable>
        ) : (
          <Text style={{ color: c.textMuted, fontSize: 12 }}>{rightText}</Text>
        ))}
    </View>
  );
}
