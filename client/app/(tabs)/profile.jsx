import { useState } from "react";
import {
    Alert,
    Linking,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { getErrorKey } from "../../utils/errorCodes";
import BottomSheet from "../../components/BottomSheet";
import SectionHeader from "../../components/SectionHeader";
import SettingsItem from "../../components/SettingsItem";
import GradientButton from "../../components/GradientButton";

export default function Profile() {
    const { t, i18n } = useTranslation();
    const { user, logout, updateUser } = useAuth();

    // Modal visibility states
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [securityModalVisible, setSecurityModalVisible] = useState(false);
    const [langModalVisible, setLangModalVisible] = useState(false);
    const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
    const [helpModalVisible, setHelpModalVisible] = useState(false);
    const [termsModalVisible, setTermsModalVisible] = useState(false);
    const [aboutModalVisible, setAboutModalVisible] = useState(false);

    // Edit profile state
    const [editName, setEditName] = useState(user?.name || "");
    const [editEmail, setEditEmail] = useState(user?.email || "");
    const [saving, setSaving] = useState(false);

    // Security state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);

    // Preferences state
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [selectedCurrency, setSelectedCurrency] = useState("RON");

    const currentLang = i18n.language?.startsWith("ro") ? "ro" : "en";

    const handleLogout = async () => {
        await logout();
    };

    // ========== EDIT PROFILE ==========
    const openEditModal = () => {
        setEditName(user?.name || "");
        setEditEmail(user?.email || "");
        setEditModalVisible(true);
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await updateUser({ name: editName, email: editEmail });
            setEditModalVisible(false);
            Alert.alert("✓", t("profile.profileUpdated"));
        } catch (err) {
            Alert.alert(t("common.error"), t("profile.profileError"));
        } finally {
            setSaving(false);
        }
    };

    // ========== SECURITY ==========
    const openSecurityModal = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSecurityModalVisible(true);
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            Alert.alert(t("common.error"), t("profile.passwordMismatch"));
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert(t("common.error"), t("profile.passwordTooShort"));
            return;
        }
        setChangingPassword(true);
        try {
            await api.put("/auth/change-password", {
                currentPassword,
                newPassword,
            });
            setSecurityModalVisible(false);
            Alert.alert("✓", t("profile.passwordChanged"));
        } catch (err) {
            const errorCode = err.response?.data?.error;
            const msg = errorCode
                ? t(getErrorKey(errorCode, "profile.passwordError"))
                : t("profile.passwordError");
            Alert.alert(t("common.error"), msg);
        } finally {
            setChangingPassword(false);
        }
    };

    // ========== LANGUAGE ==========
    const handleLanguageChange = (lang) => {
        i18n.changeLanguage(lang);
        setLangModalVisible(false);
    };

    // Get user initials for avatar
    const initials = user?.name
        ? user.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : "U";

    const CURRENCIES = [
        { code: "RON", symbol: "lei", flag: "🇷🇴" },
        { code: "EUR", symbol: "€", flag: "🇪🇺" },
        { code: "USD", symbol: "$", flag: "🇺🇸" },
        { code: "GBP", symbol: "£", flag: "🇬🇧" },
    ];

    const SETTINGS_SECTIONS = [
        {
            title: t("profile.sectionAccount"),
            items: [
                {
                    key: "editProfile",
                    icon: "person-outline",
                    label: t("profile.editProfile"),
                    chevron: true,
                    iconColor: "#10B981",
                    iconBg: "rgba(16,185,129,0.12)",
                    onPress: openEditModal,
                },
                {
                    key: "security",
                    icon: "shield-checkmark-outline",
                    label: t("profile.security"),
                    chevron: true,
                    iconColor: "#6366F1",
                    iconBg: "rgba(99,102,241,0.12)",
                    onPress: openSecurityModal,
                },
                {
                    key: "notifications",
                    icon: "notifications-outline",
                    label: t("profile.notifications"),
                    iconColor: "#F59E0B",
                    iconBg: "rgba(245,158,11,0.12)",
                    rightComponent: (
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{
                                false: "#2A2A3C",
                                true: "rgba(16,185,129,0.35)",
                            }}
                            thumbColor={
                                notificationsEnabled ? "#10B981" : "#6B7280"
                            }
                        />
                    ),
                },
            ],
        },
        {
            title: t("profile.sectionPreferences"),
            items: [
                {
                    key: "language",
                    icon: "language-outline",
                    label: t("profile.language"),
                    value: currentLang === "ro" ? "Română" : "English",
                    chevron: true,
                    iconColor: "#3B82F6",
                    iconBg: "rgba(59,130,246,0.12)",
                    onPress: () => setLangModalVisible(true),
                },
                {
                    key: "currency",
                    icon: "cash-outline",
                    label: t("profile.currency"),
                    value: selectedCurrency,
                    chevron: true,
                    iconColor: "#22C55E",
                    iconBg: "rgba(34,197,94,0.12)",
                    onPress: () => setCurrencyModalVisible(true),
                },
                {
                    key: "theme",
                    icon: "moon-outline",
                    label: t("profile.theme"),
                    value: "Dark",
                    iconColor: "#8B5CF6",
                    iconBg: "rgba(139,92,246,0.12)",
                    rightComponent: (
                        <View className="bg-primary/[0.12] px-3 py-1 rounded-lg">
                            <Text className="text-primary text-xs font-semibold">
                                Dark
                            </Text>
                        </View>
                    ),
                },
            ],
        },
        {
            title: t("profile.sectionOther"),
            items: [
                {
                    key: "help",
                    icon: "help-circle-outline",
                    label: t("profile.helpSupport"),
                    chevron: true,
                    iconColor: "#06B6D4",
                    iconBg: "rgba(6,182,212,0.12)",
                    onPress: () => setHelpModalVisible(true),
                },
                {
                    key: "terms",
                    icon: "document-text-outline",
                    label: t("profile.terms"),
                    chevron: true,
                    iconColor: "#9CA3AF",
                    iconBg: "rgba(156,163,175,0.12)",
                    onPress: () => setTermsModalVisible(true),
                },
                {
                    key: "about",
                    icon: "information-circle-outline",
                    label: t("profile.about"),
                    value: t("profile.version"),
                    chevron: true,
                    iconColor: "#6B7280",
                    iconBg: "rgba(107,114,128,0.12)",
                    onPress: () => setAboutModalVisible(true),
                },
            ],
        },
    ];

    return (
        <View className="flex-1 bg-dark-bg">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View className="px-6 pt-14 pb-2">
                    <Text className="text-white text-2xl font-bold">
                        {t("profile.title")}
                    </Text>
                </View>

                {/* User Info Card */}
                <View className="mx-6 mt-4 bg-dark-surface rounded-3xl p-5 flex-row items-center border border-dark-border">
                    <View className="w-14 h-14 rounded-2xl overflow-hidden mr-4">
                        <LinearGradient
                            colors={["#10B981", "#6366F1"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                                width: 56,
                                height: 56,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Text className="text-white text-lg font-bold">
                                {initials}
                            </Text>
                        </LinearGradient>
                    </View>
                    <View className="flex-1">
                        <Text className="text-white text-lg font-bold">
                            {user?.name || t("profile.defaultUser")}
                        </Text>
                        <Text className="text-gray-500 text-sm mt-0.5">
                            {user?.email || ""}
                        </Text>
                    </View>
                    <Pressable
                        className="w-9 h-9 rounded-xl bg-white/[0.04] items-center justify-center active:opacity-70"
                        onPress={openEditModal}
                    >
                        <Ionicons
                            name="pencil-outline"
                            size={16}
                            color="#6B7280"
                        />
                    </Pressable>
                </View>

                {/* Settings Sections */}
                {SETTINGS_SECTIONS.map((section) => (
                    <View key={section.title} className="mt-7">
                        <View className="px-6">
                            <SectionHeader title={section.title} />
                        </View>
                        <View className="mx-6 bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
                            {section.items.map((item, idx) => (
                                <SettingsItem
                                    key={item.key}
                                    icon={item.icon}
                                    iconColor={item.iconColor}
                                    iconBg={item.iconBg}
                                    label={item.label}
                                    value={item.value}
                                    chevron={item.chevron}
                                    rightComponent={item.rightComponent}
                                    onPress={item.onPress}
                                    isLast={idx === section.items.length - 1}
                                />
                            ))}
                        </View>
                    </View>
                ))}

                {/* Logout */}
                <Pressable
                    className="mx-6 mt-8 rounded-2xl overflow-hidden active:opacity-80"
                    onPress={handleLogout}
                >
                    <View className="bg-expense/[0.08] rounded-2xl py-4 items-center flex-row justify-center border border-expense/15">
                        <Ionicons
                            name="log-out-outline"
                            size={18}
                            color="#F43F5E"
                        />
                        <Text className="text-expense font-semibold ml-2">
                            {t("profile.logout")}
                        </Text>
                    </View>
                </Pressable>
            </ScrollView>

            {/* ==================== MODALS ==================== */}

            {/* ===== 1. EDIT PROFILE ===== */}
            <BottomSheet
                visible={editModalVisible}
                onClose={() => setEditModalVisible(false)}
            >
                <Text className="text-white text-xl font-bold mb-6">
                    {t("profile.editProfileTitle")}
                </Text>

                <View className="bg-dark-bg rounded-xl px-4 py-3.5 mb-3 border border-dark-border flex-row items-center">
                    <Ionicons
                        name="person-outline"
                        size={18}
                        color="#6B7280"
                    />
                    <TextInput
                        className="flex-1 text-white ml-3 text-sm"
                        value={editName}
                        onChangeText={setEditName}
                        placeholder={t("profile.namePlaceholder")}
                        placeholderTextColor="#4B5563"
                    />
                </View>

                <View className="bg-dark-bg rounded-xl px-4 py-3.5 mb-6 border border-dark-border flex-row items-center">
                    <Ionicons
                        name="mail-outline"
                        size={18}
                        color="#6B7280"
                    />
                    <TextInput
                        className="flex-1 text-white ml-3 text-sm"
                        value={editEmail}
                        onChangeText={setEditEmail}
                        placeholder={t("profile.emailPlaceholder")}
                        placeholderTextColor="#4B5563"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                <GradientButton
                    label={saving ? t("common.loading") : t("profile.saveChanges")}
                    onPress={handleSaveProfile}
                    disabled={saving}
                />
            </BottomSheet>

            {/* ===== 2. SECURITY (Change Password) ===== */}
            <BottomSheet
                visible={securityModalVisible}
                onClose={() => setSecurityModalVisible(false)}
            >
                <Text className="text-white text-xl font-bold mb-6">
                    {t("profile.securityTitle")}
                </Text>

                <View className="bg-dark-bg rounded-xl px-4 py-3.5 mb-3 border border-dark-border flex-row items-center">
                    <Ionicons
                        name="lock-closed-outline"
                        size={18}
                        color="#6B7280"
                    />
                    <TextInput
                        className="flex-1 text-white ml-3 text-sm"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder={t("profile.currentPassword")}
                        placeholderTextColor="#4B5563"
                        secureTextEntry
                    />
                </View>

                <View className="bg-dark-bg rounded-xl px-4 py-3.5 mb-3 border border-dark-border flex-row items-center">
                    <Ionicons
                        name="key-outline"
                        size={18}
                        color="#6B7280"
                    />
                    <TextInput
                        className="flex-1 text-white ml-3 text-sm"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder={t("profile.newPassword")}
                        placeholderTextColor="#4B5563"
                        secureTextEntry
                    />
                </View>

                <View className="bg-dark-bg rounded-xl px-4 py-3.5 mb-6 border border-dark-border flex-row items-center">
                    <Ionicons
                        name="key-outline"
                        size={18}
                        color="#6B7280"
                    />
                    <TextInput
                        className="flex-1 text-white ml-3 text-sm"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder={t("profile.confirmPassword")}
                        placeholderTextColor="#4B5563"
                        secureTextEntry
                    />
                </View>

                <GradientButton
                    label={
                        changingPassword
                            ? t("common.loading")
                            : t("profile.changePassword")
                    }
                    onPress={handleChangePassword}
                    disabled={changingPassword}
                    colors={["#6366F1", "#4F46E5"]}
                />
            </BottomSheet>

            {/* ===== 3. LANGUAGE PICKER ===== */}
            <BottomSheet
                visible={langModalVisible}
                onClose={() => setLangModalVisible(false)}
            >
                <Text className="text-white text-xl font-bold mb-6">
                    {t("profile.selectLanguage")}
                </Text>

                <Pressable
                    className={`flex-row items-center p-4 rounded-xl mb-2 border ${currentLang === "ro"
                        ? "bg-primary/[0.08] border-primary/30"
                        : "bg-dark-bg border-dark-border"
                        }`}
                    onPress={() => handleLanguageChange("ro")}
                >
                    <Text className="text-2xl mr-3">🇷🇴</Text>
                    <Text className="text-white font-medium flex-1">
                        {t("profile.romanian")}
                    </Text>
                    {currentLang === "ro" && (
                        <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color="#10B981"
                        />
                    )}
                </Pressable>

                <Pressable
                    className={`flex-row items-center p-4 rounded-xl border ${currentLang === "en"
                        ? "bg-primary/[0.08] border-primary/30"
                        : "bg-dark-bg border-dark-border"
                        }`}
                    onPress={() => handleLanguageChange("en")}
                >
                    <Text className="text-2xl mr-3">🇬🇧</Text>
                    <Text className="text-white font-medium flex-1">
                        {t("profile.english")}
                    </Text>
                    {currentLang === "en" && (
                        <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color="#10B981"
                        />
                    )}
                </Pressable>
            </BottomSheet>

            {/* ===== 4. CURRENCY PICKER ===== */}
            <BottomSheet
                visible={currencyModalVisible}
                onClose={() => setCurrencyModalVisible(false)}
            >
                <Text className="text-white text-xl font-bold mb-6">
                    {t("profile.currencyTitle")}
                </Text>

                {CURRENCIES.map((cur) => (
                    <Pressable
                        key={cur.code}
                        className={`flex-row items-center p-4 rounded-xl mb-2 border ${selectedCurrency === cur.code
                            ? "bg-primary/[0.08] border-primary/30"
                            : "bg-dark-bg border-dark-border"
                            }`}
                        onPress={() => {
                            setSelectedCurrency(cur.code);
                            setCurrencyModalVisible(false);
                        }}
                    >
                        <Text className="text-2xl mr-3">{cur.flag}</Text>
                        <Text className="text-white font-medium flex-1">
                            {cur.code}
                        </Text>
                        <Text className="text-gray-500 text-sm mr-2">
                            {cur.symbol}
                        </Text>
                        {selectedCurrency === cur.code && (
                            <Ionicons
                                name="checkmark-circle"
                                size={22}
                                color="#10B981"
                            />
                        )}
                    </Pressable>
                ))}
            </BottomSheet>

            {/* ===== 5. HELP & SUPPORT ===== */}
            <BottomSheet
                visible={helpModalVisible}
                onClose={() => setHelpModalVisible(false)}
            >
                <Text className="text-white text-xl font-bold mb-4">
                    {t("profile.helpTitle")}
                </Text>

                <Text className="text-gray-400 text-sm mb-4">
                    {t("profile.helpDesc")}
                </Text>

                {/* Email contact */}
                <Pressable
                    className="flex-row items-center bg-dark-bg p-4 rounded-xl mb-4 border border-dark-border active:opacity-70"
                    onPress={() =>
                        Linking.openURL(`mailto:${t("profile.helpEmail")}`)
                    }
                >
                    <View className="w-9 h-9 rounded-xl bg-primary/[0.12] items-center justify-center mr-3">
                        <Ionicons name="mail" size={18} color="#10B981" />
                    </View>
                    <Text className="text-primary font-medium flex-1">
                        {t("profile.helpEmail")}
                    </Text>
                    <Ionicons
                        name="open-outline"
                        size={16}
                        color="#6B7280"
                    />
                </Pressable>

                {/* FAQ */}
                <Text className="text-white font-semibold text-sm mb-3">
                    {t("profile.helpFAQ")}
                </Text>

                <View className="bg-dark-bg rounded-xl border border-dark-border overflow-hidden mb-1">
                    <View className="p-4 border-b border-white/[0.04]">
                        <Text className="text-white text-sm font-medium mb-1">
                            {t("profile.helpFAQ1Q")}
                        </Text>
                        <Text className="text-gray-500 text-xs leading-5">
                            {t("profile.helpFAQ1A")}
                        </Text>
                    </View>
                    <View className="p-4">
                        <Text className="text-white text-sm font-medium mb-1">
                            {t("profile.helpFAQ2Q")}
                        </Text>
                        <Text className="text-gray-500 text-xs leading-5">
                            {t("profile.helpFAQ2A")}
                        </Text>
                    </View>
                </View>
            </BottomSheet>

            {/* ===== 6. TERMS & CONDITIONS ===== */}
            <BottomSheet
                visible={termsModalVisible}
                onClose={() => setTermsModalVisible(false)}
            >
                <Text className="text-white text-xl font-bold mb-4">
                    {t("profile.termsTitle")}
                </Text>

                <View className="bg-dark-bg rounded-xl p-4 border border-dark-border">
                    <Text className="text-gray-400 text-sm leading-6">
                        {t("profile.termsContent")}
                    </Text>
                </View>
            </BottomSheet>

            {/* ===== 7. ABOUT ===== */}
            <BottomSheet
                visible={aboutModalVisible}
                onClose={() => setAboutModalVisible(false)}
            >
                {/* App logo / icon */}
                <View className="items-center mb-5">
                    <View className="w-16 h-16 rounded-2xl overflow-hidden mb-3">
                        <LinearGradient
                            colors={["#10B981", "#6366F1"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                                width: 64,
                                height: 64,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Text className="text-white text-2xl font-bold">
                                N
                            </Text>
                        </LinearGradient>
                    </View>
                    <Text className="text-white text-xl font-bold">
                        Novence
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1">
                        {t("profile.version")}
                    </Text>
                </View>

                <Text className="text-gray-400 text-sm leading-6 text-center mb-5">
                    {t("profile.aboutDesc")}
                </Text>

                <View className="bg-dark-bg rounded-xl p-4 border border-dark-border">
                    <View className="flex-row items-center mb-2">
                        <Ionicons
                            name="code-slash"
                            size={16}
                            color="#6366F1"
                        />
                        <Text className="text-gray-400 text-sm ml-2">
                            {t("profile.aboutDeveloper")}:{" "}
                            <Text className="text-white font-medium">
                                {t("profile.aboutDeveloperName")}
                            </Text>
                        </Text>
                    </View>
                    <View className="flex-row items-center">
                        <Ionicons
                            name="layers-outline"
                            size={16}
                            color="#10B981"
                        />
                        <Text className="text-gray-400 text-sm ml-2">
                            {t("profile.aboutTech")}
                        </Text>
                    </View>
                </View>
            </BottomSheet>
        </View>
    );
}
