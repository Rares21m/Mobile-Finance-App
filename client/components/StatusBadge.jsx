import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

function withAlpha(color, alpha) {
  if (!color || typeof color !== "string") return `rgba(0,0,0,${alpha})`;

  if (color.startsWith("#") && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return color;
}

export default function StatusBadge({
  label,
  variant = "neutral",
  icon,
  size = "md",
  style
}) {
  const { theme, tokens } = useTheme();
  const c = theme.colors;

  const PALETTE = {
    success: { text: c.success, bg: withAlpha(c.success, 0.14), border: withAlpha(c.success, 0.3), icon: "checkmark-circle" },
    warning: { text: c.warning, bg: withAlpha(c.warning, 0.14), border: withAlpha(c.warning, 0.3), icon: "alert-circle" },
    error: { text: c.expense, bg: withAlpha(c.expense, 0.14), border: withAlpha(c.expense, 0.3), icon: "close-circle" },
    info: { text: c.info, bg: withAlpha(c.info, 0.14), border: withAlpha(c.info, 0.3), icon: "information-circle" },
    trust: { text: c.trust, bg: withAlpha(c.trust, 0.14), border: withAlpha(c.trust, 0.3), icon: "shield-checkmark" },
    neutral: { text: c.neutral, bg: withAlpha(c.border, 0.35), border: withAlpha(c.border, 0.65), icon: "ellipse" }
  };

  const SIZE_MAP = {
    sm: { py: 4, px: 8, text: tokens.typography.sizes.xs, icon: 12 },
    md: { py: 6, px: 10, text: tokens.typography.sizes.xs, icon: 13 },
    lg: { py: 8, px: 12, text: tokens.typography.sizes.sm, icon: 14 }
  };

  const palette = PALETTE[variant] || PALETTE.neutral;
  const sizing = SIZE_MAP[size] || SIZE_MAP.md;
  const iconName = icon || palette.icon;

  return (
    <View
      style={[
      {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: tokens.spacing.xs,
        paddingVertical: sizing.py,
        paddingHorizontal: sizing.px,
        borderRadius: tokens.radius.pill,
        backgroundColor: palette.bg,
        borderWidth: 1,
        borderColor: palette.border
      },
      style]
      }>
      
      <Ionicons name={iconName} size={sizing.icon} color={palette.text} />
      <Text style={{ color: palette.text, fontSize: sizing.text, fontWeight: "600" }}>
        {label}
      </Text>
    </View>);

}