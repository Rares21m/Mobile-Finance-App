import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

export default function Welcome() {
    const { t } = useTranslation();

    return (
        <View className="flex-1 bg-dark-bg">
            <LinearGradient
                colors={["#0C0C14", "#0A1A14", "#0C0C14"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
            >
                {/* Decorative shapes */}
                <View
                    style={{
                        position: "absolute",
                        top: -120,
                        left: -80,
                        width: 320,
                        height: 320,
                        borderRadius: 160,
                        backgroundColor: "rgba(16,185,129,0.12)",
                    }}
                />
                <View
                    style={{
                        position: "absolute",
                        top: 180,
                        right: -60,
                        width: 240,
                        height: 240,
                        borderRadius: 120,
                        backgroundColor: "rgba(99,102,241,0.08)",
                    }}
                />
                <View
                    style={{
                        position: "absolute",
                        bottom: 200,
                        left: 30,
                        width: 180,
                        height: 180,
                        borderRadius: 90,
                        backgroundColor: "rgba(16,185,129,0.06)",
                    }}
                />
                {/* Subtle grid decoration */}
                <View
                    style={{
                        position: "absolute",
                        top: 160,
                        left: 40,
                        width: 200,
                        height: 200,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.03)",
                        borderRadius: 24,
                        transform: [{ rotate: "25deg" }],
                    }}
                />
                <View
                    style={{
                        position: "absolute",
                        top: 190,
                        left: 60,
                        width: 200,
                        height: 200,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.02)",
                        borderRadius: 24,
                        transform: [{ rotate: "25deg" }],
                    }}
                />

                {/* Brand */}
                <View className="pt-20 px-8">
                    <View className="flex-row items-center">
                        <View className="w-10 h-10 rounded-xl bg-primary/20 items-center justify-center mr-3">
                            <Ionicons name="wallet" size={22} color="#10B981" />
                        </View>
                        <Text
                            className="text-white/60 text-sm font-bold"
                            style={{ letterSpacing: 4 }}
                        >
                            NOVENCE
                        </Text>
                    </View>
                </View>

                {/* Hero text */}
                <View className="flex-1 justify-end px-8 pb-8">
                    <Text className="text-white text-[42px] font-extrabold leading-tight">
                        {t("auth.welcomeTitle1")}
                    </Text>
                    <Text className="text-primary text-[42px] font-extrabold leading-tight mb-4">
                        {t("auth.welcomeTitle2")}
                    </Text>
                    <Text className="text-gray-400 text-base leading-6 mb-10">
                        {t("auth.welcomeSubtitle")}
                    </Text>

                    {/* Action buttons */}
                    <View className="flex-row gap-3 mb-6">
                        <Pressable
                            className="flex-1 border border-white/15 rounded-2xl py-4 items-center active:opacity-70"
                            style={({ pressed }) => ({
                                backgroundColor: pressed
                                    ? "rgba(255,255,255,0.05)"
                                    : "transparent",
                            })}
                            onPress={() => router.push("/(auth)/sign-in")}
                        >
                            <Text className="text-white font-bold text-base">
                                {t("auth.login")}
                            </Text>
                        </Pressable>

                        <Pressable
                            className="flex-1 rounded-2xl py-4 items-center active:opacity-90 overflow-hidden"
                            onPress={() => router.push("/(auth)/sign-up")}
                        >
                            <LinearGradient
                                colors={["#10B981", "#059669"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                }}
                            />
                            <Text className="text-white font-bold text-base">
                                {t("auth.register")}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}
