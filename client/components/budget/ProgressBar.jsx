import { View } from "react-native";
import { useTheme } from "../../context/ThemeContext";

export default function ProgressBar({ percentage, status, c, style }) {
  const { isDark } = useTheme();
  const clampedPct = Math.min(percentage ?? 0, 100);
  const color =
  status === "over" ?
  c.expense :
  status === "warning" ?
  "#F59E0B" :
  c.success ?? "#10B981";

  return (
    <View
      style={[{
        height: 6,
        borderRadius: 3,
        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
        overflow: "hidden",
        marginTop: 8
      }, style]}>
      
      <View
        style={{
          height: "100%",
          width: `${clampedPct}%`,
          borderRadius: 3,
          backgroundColor: color
        }} />
      
    </View>);

}