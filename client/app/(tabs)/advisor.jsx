import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useRef, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "react-i18next";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

export default function Advisor() {
    const { isDark, theme } = useTheme();
    const c = theme.colors;
    const { t } = useTranslation();

    // Initial messages and suggestions
    const INITIAL_MESSAGES = useMemo(
        () => [
            {
                id: "1",
                role: "assistant",
                text: t("advisor.initialMessage"),
            },
        ],
        [t]
    );

    const SUGGESTIONS = useMemo(
        () => [
            t("advisor.suggestion1"),
            t("advisor.suggestion2"),
            t("advisor.suggestion3"),
        ],
        [t]
    );

    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [input, setInput] = useState("");
    const scrollRef = useRef(null);

    // Send message handler
    const sendMessage = () => {
        if (!input.trim()) return;

        const userMsg = {
            id: Date.now().toString(),
            role: "user",
            text: input.trim(),
        };

        const aiReply = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            text: t("advisor.demoReply"),
        };

        setMessages((prev) => [...prev, userMsg, aiReply]);
        setInput("");
        setTimeout(
            () => scrollRef.current?.scrollToEnd({ animated: true }),
            100
        );
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-background"
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={90}
        >
            {/* ===== HEADER ===== */}
            <LinearGradient
                colors={c.headerGradient}
                style={{
                    paddingTop: 56,
                    paddingBottom: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 0.5,
                    borderBottomColor: c.border,
                }}
            >
                <View className="flex-row items-center">
                    <View className="w-11 h-11 rounded-xl bg-primary/15 items-center justify-center mr-3">
                        <Ionicons name="sparkles" size={22} color="#10B981" />
                    </View>
                    <View>
                        <Text className="text-foreground text-lg font-bold">
                            {t("advisor.title")}
                        </Text>
                        <Text className="text-primary text-xs font-medium">
                            {t("advisor.online")}
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            {/* ===== MESSAGES ===== */}
            <ScrollView
                ref={scrollRef}
                className="flex-1 px-5"
                contentContainerStyle={{ paddingVertical: 16 }}
                showsVerticalScrollIndicator={false}
            >
                {messages.map((msg) => (
                    <View
                        key={msg.id}
                        className={`mb-3 max-w-[85%] ${msg.role === "user" ? "self-end" : "self-start"
                            }`}
                    >
                        {msg.role === "user" ? (
                            <View className="rounded-2xl rounded-br-sm overflow-hidden">
                                <LinearGradient
                                    colors={["#10B981", "#059669"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                    }}
                                >
                                    <Text className="text-foreground text-sm leading-5">
                                        {msg.text}
                                    </Text>
                                </LinearGradient>
                            </View>
                        ) : (
                            <View className="bg-surface rounded-2xl rounded-bl-sm px-4 py-3 border border-border">
                                <Text className="text-text-muted text-sm leading-5">
                                    {msg.text}
                                </Text>
                            </View>
                        )}
                    </View>
                ))}

                {/* Quick suggestions */}
                {messages.length <= 2 && (
                    <View className="mt-4 gap-2.5">
                        <Text className="text-text-muted text-xs mb-1">
                            {t("advisor.suggestions")}
                        </Text>
                        {SUGGESTIONS.map((sug) => (
                            <Pressable
                                key={sug}
                                className="border border-primary/20 rounded-2xl px-4 py-3 active:opacity-70 bg-primary/[0.04]"
                                onPress={() => {
                                    setInput(sug);
                                }}
                            >
                                <Text className="text-text-muted text-sm">
                                    {sug}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* ===== INPUT BAR ===== */}
            <View className="px-4 py-3 border-t border-border bg-background">
                <View className="flex-row items-center bg-surface rounded-2xl px-4 py-2 border border-border">
                    <TextInput
                        className="flex-1 text-foreground text-sm py-2"
                        placeholder={t("advisor.inputPlaceholder")}
                        placeholderTextColor="#94A3B8"
                        value={input}
                        onChangeText={setInput}
                        onSubmitEditing={sendMessage}
                        returnKeyType="send"
                    />
                    <Pressable
                        className="w-9 h-9 rounded-xl items-center justify-center ml-2 overflow-hidden"
                        onPress={sendMessage}
                        disabled={!input.trim()}
                    >
                        {input.trim() ? (
                            <LinearGradient
                                colors={["#10B981", "#059669"]}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 12,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Ionicons
                                    name="arrow-up"
                                    size={18}
                                    color="white"
                                />
                            </LinearGradient>
                        ) : (
                            <View className="w-9 h-9 rounded-xl bg-primary/20 items-center justify-center">
                                <Ionicons
                                    name="arrow-up"
                                    size={18}
                                    color="#6B7280"
                                />
                            </View>
                        )}
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
