import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

export default function PageShell({
  title,
  subtitle,
  rightAction,
  stickyHeader = true,
  scroll = true,
  footer,
  children,
  contentContainerStyle
}) {
  const { theme, tokens } = useTheme();
  const c = theme.colors;

  const header =
  <View
    style={{
      backgroundColor: c.bg,
      paddingHorizontal: tokens.spacing.lg,
      paddingTop: tokens.spacing.md,
      paddingBottom: tokens.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: withAlpha(c.border, 0.5)
    }}>
    
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1, paddingRight: tokens.spacing.md }}>
          {!!title &&
        <Text style={{ color: c.foreground, fontSize: tokens.typography.sizes.xl, fontWeight: "800" }}>
              {title}
            </Text>
        }
          {!!subtitle &&
        <Text
          style={{
            color: c.textMuted,
            fontSize: tokens.typography.sizes.sm,
            marginTop: tokens.spacing.xs
          }}>
          
              {subtitle}
            </Text>
        }
        </View>
        {rightAction || null}
      </View>
    </View>;


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top", "left", "right"]}>
      {scroll ?
      <ScrollView
        stickyHeaderIndices={stickyHeader && title ? [0] : undefined}
        contentContainerStyle={[
        {
          paddingBottom: footer ? tokens.spacing.xl + 72 : tokens.spacing.xl
        },
        contentContainerStyle]
        }
        showsVerticalScrollIndicator={false}>
        
          {title ? header : null}
          {children}
        </ScrollView> :

      <View style={{ flex: 1 }}>
          {title ? header : null}
          <View style={[{ flex: 1 }, contentContainerStyle]}>{children}</View>
        </View>
      }

      {!!footer &&
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.sm,
          paddingBottom: tokens.spacing.lg,
          backgroundColor: c.bg,
          borderTopWidth: 1,
          borderTopColor: withAlpha(c.border, 0.5)
        }}>
        
          {footer}
        </View>
      }
    </SafeAreaView>);

}

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