import { Link } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, Text, View } from "react-native";

import { useAuth } from "../../context/AuthContext";
import { getErrorKey } from "../../utils/errorCodes";
import CircularLoading from "../../components/CircularLoading";
import AuthBackground from "../../components/AuthBackground";
import GlassCard from "../../components/GlassCard";
import GlassInput from "../../components/GlassInput";
import GradientButton from "../../components/GradientButton";

export default function SignIn() {
    const { t } = useTranslation();
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    function validate() {
        const newErrors = {};
        if (!email.trim()) newErrors.email = t("auth.errors.emailRequired");
        else if (!/\S+@\S+\.\S+/.test(email))
            newErrors.email = t("auth.errors.emailInvalid");
        if (!password) newErrors.password = t("auth.errors.passwordRequired");
        else if (password.length < 6)
            newErrors.password = t("auth.errors.passwordMin");
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function onLogin() {
        if (!validate()) return;
        setLoading(true);
        try {
            await login(email.trim().toLowerCase(), password);
        } catch (err) {
            const errorCode = err.response?.data?.error;
            const message = errorCode
                ? t(getErrorKey(errorCode, "auth.errors.loginError"))
                : t("auth.errors.loginError");
            Alert.alert(t("common.error"), message);
            setLoading(false);
        }
    }

    if (loading) return <CircularLoading />;

    return (
        <AuthBackground>
            <View className="flex-1 justify-center px-7">
                {/* Header */}
                <Text className="text-white text-3xl font-extrabold text-center mb-2">
                    {t("auth.welcomeBack")}
                </Text>
                <Text className="text-gray-400 text-base text-center mb-10">
                    {t("auth.signInSubtitle")}
                </Text>

                {/* Glass card */}
                <GlassCard>
                    <GlassInput
                        label={t("auth.email")}
                        icon="mail-outline"
                        value={email}
                        onChangeText={setEmail}
                        placeholder={t("auth.emailPlaceholder")}
                        error={errors.email}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <GlassInput
                        label={t("auth.password")}
                        icon="lock-closed-outline"
                        value={password}
                        onChangeText={setPassword}
                        placeholder={t("auth.passwordPlaceholder")}
                        error={errors.password}
                        isLast
                        secureTextEntry
                    />
                    <GradientButton
                        label={t("auth.login")}
                        onPress={onLogin}
                        disabled={loading}
                    />
                </GlassCard>

                {/* Footer */}
                <View className="flex-row justify-center mt-8">
                    <Text className="text-gray-500">{t("auth.noAccount")} </Text>
                    <Link href="/(auth)/sign-up" asChild>
                        <Pressable>
                            <Text className="text-primary font-semibold">
                                {t("auth.signUpLink")}
                            </Text>
                        </Pressable>
                    </Link>
                </View>
            </View>
        </AuthBackground>
    );
}
