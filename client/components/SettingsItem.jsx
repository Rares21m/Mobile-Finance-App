/**
 * @fileoverview Settings row component with icon, label, optional value,
 * chevron, and custom right component. Used in the profile screen.
 */

import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";














export default function SettingsItem({
  icon,
  iconColor,
  iconBg,
  label,
  accessibilityLabel,
  value,
  chevron,
  rightComponent,
  onPress,
  isLast = false
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable
      className={`flex-row items-center px-4 py-4 active:opacity-70 ${!isLast ? "border-b border-border" : ""}`
      }
      onPress={onPress}
      disabled={!onPress && !rightComponent}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel || label}>
      
            <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: iconBg }}>
        
                <Ionicons name={icon} size={18} color={iconColor} />
            </View>
            <Text className="flex-1 text-foreground text-sm font-medium">
                {label}
            </Text>
            {rightComponent ? rightComponent : null}
            {value && !rightComponent &&
      <Text className="text-text-muted text-sm mr-2">{value}</Text>
      }
            {chevron &&
      <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
      }
        </Pressable>);

}