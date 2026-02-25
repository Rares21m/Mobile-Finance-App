import { Stack } from "expo-router";
import { Provider as PaperProvider } from "react-native-paper";
import { paperTheme } from "../constants/theme";
import { AuthProvider } from "../context/AuthContext";
import { BankProvider } from "../context/BankContext";
import "../global.css";
import "../i18n/i18n";

export default function RootLayout() {
    return (
        <PaperProvider theme={paperTheme}>
            <AuthProvider>
                <BankProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(tabs)" />
                    </Stack>
                </BankProvider>
            </AuthProvider>
        </PaperProvider>
    );
}