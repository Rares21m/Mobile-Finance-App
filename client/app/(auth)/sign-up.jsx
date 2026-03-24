import { Link } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";

import AuthBackground from "../../components/AuthBackground";
import CircularLoading from "../../components/CircularLoading";
import GlassCard from "../../components/GlassCard";
import GlassInput from "../../components/GlassInput";
import GradientButton from "../../components/GradientButton";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getErrorKey } from "../../utils/errorCodes";

export default function SignUp() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const newErrors = {};
    if (!name.trim()) newErrors.name = t("auth.errors.nameRequired");
    if (!email.trim()) newErrors.email = t("auth.errors.emailRequired");else
    if (!/\S+@\S+\.\S+/.test(email))
    newErrors.email = t("auth.errors.emailInvalid");
    if (!password) newErrors.password = t("auth.errors.passwordRequired");else
    if (password.length < 6)
    newErrors.password = t("auth.errors.passwordMin");
    if (password !== confirmPassword)
    newErrors.confirmPassword = t("auth.errors.passwordMismatch");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function onRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, name.trim());
    } catch (err) {
      const errorCode = err.response?.data?.error;
      const message = errorCode ?
      t(getErrorKey(errorCode, "auth.errors.registerError")) :
      t("auth.errors.registerError");
      showToast(message, "error");
      setLoading(false);
    }
  }

  if (loading) return <CircularLoading />;

  return (
    <AuthBackground>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        className="px-7"
        keyboardShouldPersistTaps="handled">
        
        {}
        <Text className="text-foreground text-3xl font-extrabold text-center mb-2 mt-20">
          {t("auth.createAccount")}
        </Text>
        <Text className="text-text-muted text-base text-center mb-10">
          {t("auth.signUpSubtitle")}
        </Text>

        {}
        <GlassCard>
          <GlassInput
            label={t("auth.fullName")}
            icon="person-outline"
            value={name}
            onChangeText={setName}
            placeholder={t("auth.fullNamePlaceholder")}
            error={errors.name} />
          
          <GlassInput
            label={t("auth.email")}
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder={t("auth.emailPlaceholder")}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none" />
          
          <GlassInput
            label={t("auth.password")}
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder={t("auth.passwordPlaceholder")}
            error={errors.password}
            secureTextEntry />
          
          <GlassInput
            label={t("auth.confirmPassword")}
            icon="lock-closed-outline"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t("auth.passwordPlaceholder")}
            error={errors.confirmPassword}
            isLast
            secureTextEntry />
          
          <GradientButton
            label={t("auth.register")}
            onPress={onRegister}
            disabled={loading} />
          
        </GlassCard>

        {}
        <View className="flex-row justify-center mt-8 mb-10">
          <Text className="text-text-muted">{t("auth.hasAccount")} </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Text className="text-primary font-semibold">
                {t("auth.signInLink")}
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </AuthBackground>);

}