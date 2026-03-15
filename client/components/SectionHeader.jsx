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
export default function SectionHeader({
  title,
  subtitle,
  rightText,
  onPress,
  compact = false,
}) {
  const { theme, tokens } = useTheme();
  const c = theme.colors;

  const titleSize = compact
    ? tokens.typography.sizes.xs
    : tokens.typography.sizes.sm;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: subtitle ? "flex-start" : "center",
        justifyContent: "space-between",
        marginBottom: tokens.spacing.md,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm }}>
        <View
          style={{
            width: 3,
            height: subtitle ? 24 : 16,
            borderRadius: 2,
            backgroundColor: c.primary,
          }}
        />
        <Text
          style={{
            color: c.foreground,
            fontSize: titleSize,
            fontWeight: "600",
            letterSpacing: 0.2,
          }}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ color: c.textMuted, fontSize: tokens.typography.sizes.xs }}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightText &&
        (onPress ? (
          <Pressable
            onPress={onPress}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text
              style={{
                color: c.primary,
                fontSize: tokens.typography.sizes.xs,
                fontWeight: "600",
              }}
            >
              {rightText}
            </Text>
          </Pressable>
        ) : (
          <Text style={{ color: c.textMuted, fontSize: tokens.typography.sizes.xs }}>
            {rightText}
          </Text>
        ))}
    </View>
  );
}
