import { View } from "react-native";

export default function ChartSkeleton({ isDark, height = 160 }) {
  return (
    <View
      style={{
        height,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: isDark ?
        "rgba(255,255,255,0.06)" :
        "rgba(0,0,0,0.05)",
        backgroundColor: isDark ?
        "rgba(255,255,255,0.03)" :
        "rgba(0,0,0,0.02)",
        paddingHorizontal: 14,
        paddingVertical: 12,
        justifyContent: "flex-end"
      }}>
      
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        {[30, 55, 40, 65, 45, 58, 34].map((size, idx) =>
        <View
          key={`skeleton-bar-${idx}`}
          style={{
            flex: 1,
            height: size,
            borderRadius: 6,
            backgroundColor: isDark ?
            "rgba(255,255,255,0.06)" :
            "rgba(0,0,0,0.06)"
          }} />

        )}
      </View>
    </View>);

}