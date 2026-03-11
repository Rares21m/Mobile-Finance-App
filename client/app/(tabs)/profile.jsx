import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { useToast } from "../../context/ToastContext";

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

import BottomSheet from "../../components/BottomSheet";
import GradientButton from "../../components/GradientButton";
import SectionHeader from "../../components/SectionHeader";
import SettingsItem from "../../components/SettingsItem";
import { useAuth } from "../../context/AuthContext";
import { useBadges } from "../../context/BadgesContext";
import { useTheme } from "../../context/ThemeContext";
import api from "../../services/api";
import { getErrorKey } from "../../utils/errorCodes";

export default function Profile() {
  const { t, i18n } = useTranslation();
  const {
    user,
    logout,
    updateUser,
    biometricEnabled,
    biometricAvailable,
    disableBiometric,
  } = useAuth();
  const { themeMode, setTheme, isDark, theme } = useTheme();
  const c = theme.colors;
  const { showToast } = useToast();
  const { badges, totalPoints } = useBadges();
  const lang = i18n.language?.startsWith("ro") ? "Ro" : "En";

  const earnedCount = badges.filter((b) => b.earned).length;

  // Modal visibility states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
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
  const [pickingAvatar, setPickingAvatar] = useState(false);

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
      showToast(t("profile.profileUpdated"), "success");
    } catch (err) {
      showToast(t("profile.profileError"), "error");
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
      showToast(t("profile.passwordMismatch"), "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast(t("profile.passwordTooShort"), "error");
      return;
    }
    setChangingPassword(true);
    try {
      await api.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setSecurityModalVisible(false);
      showToast(t("profile.passwordChanged"), "success");
    } catch (err) {
      const errorCode = err.response?.data?.error;
      const msg = errorCode
        ? t(getErrorKey(errorCode, "profile.passwordError"))
        : t("profile.passwordError");
      showToast(msg, "error");
    } finally {
      setChangingPassword(false);
    }
  };

  // ========== LANGUAGE ==========
  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    setLangModalVisible(false);
  };

  // ========== AVATAR ==========
  const handlePickAvatar = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showToast(t("profile.avatarPermissionDenied"), "error");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      setPickingAvatar(true);
      const asset = result.assets[0];
      const mimeType = asset.mimeType || "image/jpeg";
      const base64Uri = `data:${mimeType};base64,${asset.base64}`;
      await updateUser({ avatar: base64Uri });
      showToast(t("profile.avatarUpdated"), "success");
    } catch (err) {
      showToast(t("profile.avatarError"), "error");
    } finally {
      setPickingAvatar(false);
    }
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
        ...(biometricAvailable
          ? [
              {
                key: "biometric",
                icon: "finger-print-outline",
                label: t("profile.biometric"),
                iconColor: "#EC4899",
                iconBg: "rgba(236,72,153,0.12)",
                value: biometricEnabled
                  ? t("profile.biometricEnabled")
                  : t("profile.biometricDisabled"),
                rightComponent: (
                  <Switch
                    value={biometricEnabled}
                    onValueChange={(val) => {
                      if (!val) {
                        Alert.alert(
                          t("profile.biometricDisableConfirm"),
                          t("profile.biometricDisableMsg"),
                          [
                            { text: t("common.cancel"), style: "cancel" },
                            {
                              text: t("profile.biometricDisableYes"),
                              style: "destructive",
                              onPress: disableBiometric,
                            },
                          ],
                        );
                      }
                    }}
                    trackColor={{
                      false: c.border,
                      true: "rgba(236,72,153,0.35)",
                    }}
                    thumbColor={biometricEnabled ? "#EC4899" : c.textMuted}
                  />
                ),
              },
            ]
          : []),
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
                false: c.border,
                true: "rgba(16,185,129,0.35)",
              }}
              thumbColor={notificationsEnabled ? "#10B981" : c.textMuted}
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
          key: "theme",
          icon: "moon-outline",
          label: t("profile.theme"),
          value: isDark ? "Dark" : "Light",
          chevron: true,
          iconColor: "#8B5CF6",
          iconBg: "rgba(139,92,246,0.12)",
          onPress: () => setThemeModalVisible(true),
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
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
        <View className="mx-6 mt-14 bg-surface rounded-3xl p-5 flex-row items-center border border-border">
          <Pressable
            className="mr-4"
            onPress={handlePickAvatar}
            disabled={pickingAvatar}
            style={{ position: "relative" }}
          >
            <View className="w-14 h-14 rounded-2xl overflow-hidden">
              {user?.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={{ width: 56, height: 56 }}
                  resizeMode="cover"
                />
              ) : (
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
                  <Text className="text-foreground text-lg font-bold">
                    {initials}
                  </Text>
                </LinearGradient>
              )}
            </View>
            {/* Camera badge */}
            <View
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: "#10B981",
                borderWidth: 2,
                borderColor: c.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {pickingAvatar ? (
                <ActivityIndicator size={10} color="white" />
              ) : (
                <Ionicons name="camera" size={10} color="white" />
              )}
            </View>
          </Pressable>
          <View className="flex-1">
            <Text className="text-foreground text-lg font-bold">
              {user?.name || t("profile.defaultUser")}
            </Text>
            <Text className="text-text-muted text-sm mt-0.5">
              {user?.email || ""}
            </Text>
          </View>
          <Pressable
            className="w-9 h-9 rounded-xl items-center justify-center active:opacity-70"
            style={{ backgroundColor: c.card }}
            onPress={openEditModal}
          >
            <Ionicons name="pencil-outline" size={16} color="#6B7280" />
          </Pressable>
        </View>

        {/* Settings Sections */}
        {SETTINGS_SECTIONS.map((section) => (
          <View key={section.title} className="mt-7">
            <View className="px-6">
              <SectionHeader title={section.title} />
            </View>
            <View className="mx-6 bg-surface rounded-2xl border border-border overflow-hidden">
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

        {/* Achievements / Badges */}
        <View className="mt-7 mb-2">
          <View className="px-6">
            <SectionHeader title={t("profile.achievements")} />
          </View>

          {/* XP summary bar */}
          <View
            className="mx-6 mt-3 rounded-2xl p-4 flex-row items-center border border-border"
            style={{ backgroundColor: c.surface }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "rgba(245,158,11,0.15)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 22 }}>⚡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: "700", fontSize: 16 }}>
                {totalPoints} XP
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 1 }}>
                {earnedCount} / {badges.length} {t("profile.badgesUnlocked")}
              </Text>
            </View>
          </View>

          {/* Badge grid */}
          <View
            style={{
              marginHorizontal: 24,
              marginTop: 12,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {badges.map((badge) => {
              const name = badge[`name${lang}`] || badge.nameEn;
              const desc = badge[`desc${lang}`] || badge.descEn;
              return (
                <View
                  key={badge.id}
                  style={{
                    width: "30%",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: badge.earned ? badge.color + "40" : c.border,
                    backgroundColor: badge.earned
                      ? badge.color + "12"
                      : c.surface,
                    padding: 10,
                    alignItems: "center",
                    opacity: badge.earned ? 1 : 0.45,
                  }}
                >
                  <Text style={{ fontSize: 28, marginBottom: 4 }}>
                    {badge.earned ? badge.emoji : "🔒"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: badge.earned ? badge.color : c.textMuted,
                      textAlign: "center",
                      numberOfLines: 2,
                    }}
                    numberOfLines={2}
                  >
                    {name}
                  </Text>
                  {badge.earned && (
                    <Text
                      style={{
                        fontSize: 10,
                        color: badge.color,
                        fontWeight: "600",
                        marginTop: 2,
                      }}
                    >
                      +{badge.points} XP
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Logout */}
        <Pressable
          className="mx-6 mt-8 rounded-2xl overflow-hidden active:opacity-80"
          onPress={handleLogout}
        >
          <View className="bg-expense/10 rounded-2xl py-4 items-center flex-row justify-center border border-expense/15">
            <Ionicons name="log-out-outline" size={18} color="#F43F5E" />
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
        <Text className="text-foreground text-xl font-bold mb-6">
          {t("profile.editProfileTitle")}
        </Text>

        <View className="bg-background rounded-xl px-4 py-3.5 mb-3 border border-border flex-row items-center">
          <Ionicons name="person-outline" size={18} color="#6B7280" />
          <TextInput
            className="flex-1 text-foreground ml-3 text-sm"
            value={editName}
            onChangeText={setEditName}
            placeholder={t("profile.namePlaceholder")}
            placeholderTextColor={c.placeholder}
          />
        </View>

        <View className="bg-background rounded-xl px-4 py-3.5 mb-6 border border-border flex-row items-center">
          <Ionicons name="mail-outline" size={18} color="#6B7280" />
          <TextInput
            className="flex-1 text-foreground ml-3 text-sm"
            value={editEmail}
            onChangeText={setEditEmail}
            placeholder={t("profile.emailPlaceholder")}
            placeholderTextColor={c.placeholder}
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
        <Text className="text-foreground text-xl font-bold mb-6">
          {t("profile.securityTitle")}
        </Text>

        <View className="bg-background rounded-xl px-4 py-3.5 mb-3 border border-border flex-row items-center">
          <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
          <TextInput
            className="flex-1 text-foreground ml-3 text-sm"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder={t("profile.currentPassword")}
            placeholderTextColor={c.placeholder}
            secureTextEntry
          />
        </View>

        <View className="bg-background rounded-xl px-4 py-3.5 mb-3 border border-border flex-row items-center">
          <Ionicons name="key-outline" size={18} color="#6B7280" />
          <TextInput
            className="flex-1 text-foreground ml-3 text-sm"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t("profile.newPassword")}
            placeholderTextColor={c.placeholder}
            secureTextEntry
          />
        </View>

        <View className="bg-background rounded-xl px-4 py-3.5 mb-6 border border-border flex-row items-center">
          <Ionicons name="key-outline" size={18} color="#6B7280" />
          <TextInput
            className="flex-1 text-foreground ml-3 text-sm"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t("profile.confirmPassword")}
            placeholderTextColor={c.placeholder}
            secureTextEntry
          />
        </View>

        <GradientButton
          label={
            changingPassword ? t("common.loading") : t("profile.changePassword")
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
        <Text className="text-foreground text-xl font-bold mb-6">
          {t("profile.selectLanguage")}
        </Text>

        <Pressable
          className={`flex-row items-center p-4 rounded-xl mb-2 border ${
            currentLang === "ro"
              ? "bg-primary/[0.08] border-primary/30"
              : "bg-background border-border"
          }`}
          onPress={() => handleLanguageChange("ro")}
        >
          <Text className="text-2xl mr-3">🇷🇴</Text>
          <Text className="text-foreground font-medium flex-1">
            {t("profile.romanian")}
          </Text>
          {currentLang === "ro" && (
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
          )}
        </Pressable>

        <Pressable
          className={`flex-row items-center p-4 rounded-xl border ${
            currentLang === "en"
              ? "bg-primary/[0.08] border-primary/30"
              : "bg-background border-border"
          }`}
          onPress={() => handleLanguageChange("en")}
        >
          <Text className="text-2xl mr-3">🇬🇧</Text>
          <Text className="text-foreground font-medium flex-1">
            {t("profile.english")}
          </Text>
          {currentLang === "en" && (
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
          )}
        </Pressable>
      </BottomSheet>

      {/* ===== 4. THEME PICKER ===== */}
      <BottomSheet
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      >
        <Text className="text-foreground text-xl font-bold mb-6">
          {t("profile.selectTheme")}
        </Text>

        {[
          {
            mode: "dark",
            label: "Dark",
            icon: "moon",
            desc: "Dark background, easy on the eyes",
          },
          {
            mode: "light",
            label: "Light",
            icon: "sunny",
            desc: "Bright, clean interface",
          },
        ].map((opt) => (
          <Pressable
            key={opt.mode}
            className={`flex-row items-center p-4 rounded-xl mb-2 border ${
              themeMode === opt.mode
                ? "bg-primary/[0.08] border-primary/30"
                : "bg-background border-border"
            }`}
            onPress={() => {
              setTheme(opt.mode);
              setThemeModalVisible(false);
            }}
          >
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mr-3"
              style={{
                backgroundColor:
                  themeMode === opt.mode ? "rgba(16,185,129,0.12)" : c.card,
              }}
            >
              <Ionicons
                name={opt.icon}
                size={20}
                color={themeMode === opt.mode ? "#10B981" : "#6B7280"}
              />
            </View>
            <View className="flex-1">
              <Text className="text-foreground font-medium">{opt.label}</Text>
              <Text className="text-text-muted text-xs mt-0.5">{opt.desc}</Text>
            </View>
            {themeMode === opt.mode && (
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            )}
          </Pressable>
        ))}
      </BottomSheet>

      {/* ===== 6. HELP & SUPPORT ===== */}
      <BottomSheet
        visible={helpModalVisible}
        onClose={() => setHelpModalVisible(false)}
      >
        <Text className="text-foreground text-xl font-bold mb-4">
          {t("profile.helpTitle")}
        </Text>

        <Text className="text-text-muted text-sm mb-4">
          {t("profile.helpDesc")}
        </Text>

        {/* Email contact */}
        <Pressable
          className="flex-row items-center bg-background p-4 rounded-xl mb-4 border border-border active:opacity-70"
          onPress={() => Linking.openURL(`mailto:${t("profile.helpEmail")}`)}
        >
          <View className="w-9 h-9 rounded-xl overflow-hidden mr-3">
            <LinearGradient
              colors={["#10B981", "#6366F1"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 36,
                height: 36,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="mail" size={18} color="#fff" />
            </LinearGradient>
          </View>
          <Text className="text-primary font-medium flex-1">
            {t("profile.helpEmail")}
          </Text>
          <Ionicons name="open-outline" size={16} color="#6B7280" />
        </Pressable>

        {/* FAQ */}
        <Text className="text-foreground font-semibold text-sm mb-3">
          {t("profile.helpFAQ")}
        </Text>

        <View className="bg-background rounded-xl border border-border overflow-hidden mb-1">
          <View className="p-4 border-b border-foreground/10">
            <Text className="text-foreground text-sm font-medium mb-1">
              {t("profile.helpFAQ1Q")}
            </Text>
            <Text className="text-text-muted text-xs leading-5">
              {t("profile.helpFAQ1A")}
            </Text>
          </View>
          <View className="p-4">
            <Text className="text-foreground text-sm font-medium mb-1">
              {t("profile.helpFAQ2Q")}
            </Text>
            <Text className="text-text-muted text-xs leading-5">
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
        <Text className="text-foreground text-xl font-bold mb-4">
          {t("profile.termsTitle")}
        </Text>

        <View className="bg-background rounded-xl p-4 border border-border">
          <Text className="text-text-muted text-sm leading-6">
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
              <Text className="text-foreground text-2xl font-bold">N</Text>
            </LinearGradient>
          </View>
          <Text className="text-foreground text-xl font-bold">Novence</Text>
          <Text className="text-text-muted text-sm mt-1">
            {t("profile.version")}
          </Text>
        </View>

        <Text className="text-text-muted text-sm leading-6 text-center mb-5">
          {t("profile.aboutDesc")}
        </Text>

        <View className="bg-background rounded-xl p-4 border border-border">
          <View className="flex-row items-center mb-2">
            <Ionicons name="code-slash" size={16} color="#6366F1" />
            <Text className="text-text-muted text-sm ml-2">
              {t("profile.aboutDeveloper")}:{" "}
              <Text className="text-foreground font-medium">
                {t("profile.aboutDeveloperName")}
              </Text>
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="layers-outline" size={16} color="#10B981" />
            <Text className="text-text-muted text-sm ml-2">
              {t("profile.aboutTech")}
            </Text>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}
