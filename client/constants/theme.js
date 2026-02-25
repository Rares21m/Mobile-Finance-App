import { MD3DarkTheme as DefaultTheme } from "react-native-paper";

export const paperTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: "#10B981",
        secondary: "#6366F1",
        background: "#0C0C14",
        surface: "#161621",
        surfaceVariant: "#1C1C2A",
        text: "#E6EDF3",
        outline: "#2A2A3C",
        error: "#F43F5E",
        onPrimary: "#FFFFFF",
        onSurface: "#E6EDF3",
    },
    roundness: 16,
};
