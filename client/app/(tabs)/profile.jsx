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
  View } from
"react-native";
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
    disableBiometric
  } = useAuth();
  const { themeMode, setTheme, isDark, theme } = useTheme();
  const c = theme.colors;
  const { showToast } = useToast();
  const lang = i18n.language?.startsWith("ro") ? "Ro" : "En";


  const [editModalVisible, setEditModalVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);


  const [editName, setEditName] = useState(user?.name || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);


  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);


  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [pickingAvatar, setPickingAvatar] = useState(false);

  const currentLang = i18n.language?.startsWith("ro") ? "ro" : "en";
  const themeLabel = isDark ? t("profile.themeDark") : t("profile.themeLight");

  const handleLogout = async () => {
    await logout();
  };


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
    } catch (_err) {
      showToast(t("profile.profileError"), "error");
    } finally {
      setSaving(false);
    }
  };


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
        newPassword
      });
      setSecurityModalVisible(false);
      showToast(t("profile.passwordChanged"), "success");
    } catch (err) {
      const errorCode = err.response?.data?.error;
      const msg = errorCode ?
      t(getErrorKey(errorCode, "profile.passwordError")) :
      t("profile.passwordError");
      showToast(msg, "error");
    } finally {
      setChangingPassword(false);
    }
  };


  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    setLangModalVisible(false);
  };


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
        base64: true
      });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      setPickingAvatar(true);
      const asset = result.assets[0];
      const mimeType = asset.mimeType || "image/jpeg";
      const base64Uri = `data:${mimeType};base64,${asset.base64}`;
      await updateUser({ avatar: base64Uri });
      showToast(t("profile.avatarUpdated"), "success");
    } catch (_err) {
      showToast(t("profile.avatarError"), "error");
    } finally {
      setPickingAvatar(false);
    }
  };


  const initials = user?.name ?
  user.name.
  split(" ").
  map((w) => w[0]).
  join("").
  toUpperCase().
  slice(0, 2) :
  "U";

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
      a11yLabel: t("profile.a11yEditProfile")
    }]

  },
  {
    title: t("profile.sectionSecurity"),
    items: [
    {
      key: "security",
      icon: "shield-checkmark-outline",
      label: t("profile.security"),
      chevron: true,
      iconColor: "#6366F1",
      iconBg: "rgba(99,102,241,0.12)",
      onPress: openSecurityModal,
      a11yLabel: t("profile.a11ySecurity")
    },
    ...(biometricAvailable ?
    [
    {
      key: "biometric",
      icon: "finger-print-outline",
      label: t("profile.biometric"),
      iconColor: "#EC4899",
      iconBg: "rgba(236,72,153,0.12)",
      value: biometricEnabled ?
      t("profile.biometricEnabled") :
      t("profile.biometricDisabled"),
      rightComponent:
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
                onPress: disableBiometric
              }]

            );
          }
        }}
        accessibilityLabel={t("profile.a11yBiometricSwitch")}
        trackColor={{
          false: c.border,
          true: "rgba(236,72,153,0.35)"
        }}
        thumbColor={biometricEnabled ? "#EC4899" : c.textMuted} />


    }] :

    [])]

  },
  {
    title: t("profile.sectionPreferences"),
    items: [
    {
      key: "notifications",
      icon: "notifications-outline",
      label: t("profile.notifications"),
      iconColor: "#F59E0B",
      iconBg: "rgba(245,158,11,0.12)",
      rightComponent:
      <Switch
        value={notificationsEnabled}
        onValueChange={setNotificationsEnabled}
        accessibilityLabel={t("profile.a11yNotificationsSwitch")}
        trackColor={{
          false: c.border,
          true: "rgba(16,185,129,0.35)"
        }}
        thumbColor={notificationsEnabled ? "#10B981" : c.textMuted} />,


      a11yLabel: t("profile.a11yNotificationsSwitch")
    },
    {
      key: "language",
      icon: "language-outline",
      label: t("profile.language"),
      value: currentLang === "ro" ? "Română" : "English",
      chevron: true,
      iconColor: "#3B82F6",
      iconBg: "rgba(59,130,246,0.12)",
      onPress: () => setLangModalVisible(true),
      a11yLabel: t("profile.a11yLanguage")
    },
    {
      key: "theme",
      icon: "moon-outline",
      label: t("profile.theme"),
      value: themeLabel,
      chevron: true,
      iconColor: "#8B5CF6",
      iconBg: "rgba(139,92,246,0.12)",
      onPress: () => setThemeModalVisible(true),
      a11yLabel: t("profile.a11yTheme")
    }]

  },
  {
    title: t("profile.sectionSupport"),
    items: [
    {
      key: "help",
      icon: "help-circle-outline",
      label: t("profile.helpSupport"),
      chevron: true,
      iconColor: "#06B6D4",
      iconBg: "rgba(6,182,212,0.12)",
      onPress: () => setHelpModalVisible(true),
      a11yLabel: t("profile.a11yHelp")
    },
    {
      key: "terms",
      icon: "document-text-outline",
      label: t("profile.terms"),
      chevron: true,
      iconColor: "#9CA3AF",
      iconBg: "rgba(156,163,175,0.12)",
      onPress: () => setTermsModalVisible(true),
      a11yLabel: t("profile.a11yTerms")
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
      a11yLabel: t("profile.a11yAbout")
    }]

  }];


  const QUICK_ACTIONS = [
  {
    key: "security",
    icon: "shield-checkmark-outline",
    label: t("profile.security"),
    onPress: openSecurityModal,
    color: "#6366F1"
  },
  {
    key: "language",
    icon: "language-outline",
    label: t("profile.language"),
    onPress: () => setLangModalVisible(true),
    color: "#3B82F6"
  },
  {
    key: "theme",
    icon: "moon-outline",
    label: t("profile.theme"),
    onPress: () => setThemeModalVisible(true),
    color: "#8B5CF6"
  }];


  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        
        {}
        <View style={{ marginTop: 60, marginBottom: 10 }}>
          <View className="mx-6 items-center">
            {}
            <View style={{ position: "relative" }}>
              <LinearGradient
                colors={["rgba(16, 185, 129, 0.2)", "rgba(99, 102, 241, 0.2)"]}
                style={{
                  position: "absolute",
                  top: -10,
                  left: -10,
                  right: -10,
                  bottom: -10,
                  borderRadius: 40,
                  opacity: 0.6
                }} />
              
              <Pressable
                onPress={handlePickAvatar}
                disabled={pickingAvatar}
                className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl">
                
                {user?.avatar ?
                <Image source={{ uri: user.avatar }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> :

                <LinearGradient
                  colors={["#10B981", "#6366F1"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="w-full h-full items-center justify-center">
                  
                    <Text className="text-white text-3xl font-bold">{initials}</Text>
                  </LinearGradient>
                }
              </Pressable>
              
              <Pressable
                onPress={handlePickAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary items-center justify-center border-2 border-white dark:border-slate-800 shadow-lg">
                
                {pickingAvatar ?
                <ActivityIndicator size={14} color="white" /> :

                <Ionicons name="camera" size={14} color="white" />
                }
              </Pressable>
            </View>

            <View className="mt-4 items-center">
              <Text className="text-foreground text-2xl font-bold">{user?.name || t("profile.defaultUser")}</Text>
              <Text className="text-text-muted text-base mt-1">{user?.email || ""}</Text>
            </View>

            <Pressable
              onPress={openEditModal}
              className="mt-4 px-6 py-2 rounded-full border border-border flex-row items-center bg-surface active:opacity-70">
              
              <Ionicons name="pencil-outline" size={14} color={c.textMuted} />
              <Text className="text-text-muted text-sm font-semibold ml-2">{t("profile.editProfile")}</Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-6 px-6">
          <SectionHeader title={t("profile.quickActions")} />
          <View className="mt-3 flex-row gap-2.5">
            {QUICK_ACTIONS.map((action) =>
            <Pressable
              key={action.key}
              className="flex-1 rounded-xl border border-border px-2 py-3.5 bg-surface items-center active:opacity-75"
              onPress={action.onPress}
              accessibilityRole="button"
              accessibilityLabel={action.label}>
              
                <View
                className="w-8 h-8 rounded-lg items-center justify-center mb-1"
                style={{ backgroundColor: `${action.color}1F` }}>
                
                  <Ionicons name={action.icon} size={16} color={action.color} />
                </View>
                <Text className="text-foreground text-xs font-semibold" numberOfLines={1}>
                  {action.label}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {}
        {SETTINGS_SECTIONS.map((section) =>
        <View key={section.title} className="mt-7">
            <View className="px-6">
              <SectionHeader title={section.title} />
            </View>
            <View className="mx-6 bg-surface rounded-2xl border border-border overflow-hidden">
              {section.items.map((item, idx) =>
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
              accessibilityLabel={item.a11yLabel || item.label}
              isLast={idx === section.items.length - 1} />

            )}
            </View>
          </View>
        )}



        {}
        <View className="px-6 mt-12 mb-8">
          <Pressable
            onPress={handleLogout}
            className="overflow-hidden rounded-2xl shadow-sm"
            accessibilityRole="button"
            accessibilityLabel={t("profile.a11yLogout")}>
            
            <LinearGradient
              colors={["#F43F5E", "#BE123C"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="py-4 items-center flex-row justify-center">
              
              <Ionicons name="log-out-outline" size={20} color="white" />
              <Text className="text-white font-bold text-base ml-2">
                {t("profile.logout")}
              </Text>
            </LinearGradient>
          </Pressable>
          <Text className="text-text-muted text-center text-xs mt-4 opacity-50">
            {t("profile.version")}
          </Text>
        </View>
      </ScrollView>

      {}

      {}
      <BottomSheet
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}>
        
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
            placeholderTextColor={c.placeholder} />
          
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
            autoCapitalize="none" />
          
        </View>

        <GradientButton
          label={saving ? t("common.loading") : t("profile.saveChanges")}
          onPress={handleSaveProfile}
          disabled={saving} />
        
      </BottomSheet>

      {}
      <BottomSheet
        visible={securityModalVisible}
        onClose={() => setSecurityModalVisible(false)}>
        
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
            secureTextEntry />
          
        </View>

        <View className="bg-background rounded-xl px-4 py-3.5 mb-3 border border-border flex-row items-center">
          <Ionicons name="key-outline" size={18} color="#6B7280" />
          <TextInput
            className="flex-1 text-foreground ml-3 text-sm"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t("profile.newPassword")}
            placeholderTextColor={c.placeholder}
            secureTextEntry />
          
        </View>

        <View className="bg-background rounded-xl px-4 py-3.5 mb-6 border border-border flex-row items-center">
          <Ionicons name="key-outline" size={18} color="#6B7280" />
          <TextInput
            className="flex-1 text-foreground ml-3 text-sm"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t("profile.confirmPassword")}
            placeholderTextColor={c.placeholder}
            secureTextEntry />
          
        </View>

        <GradientButton
          label={
          changingPassword ? t("common.loading") : t("profile.changePassword")
          }
          onPress={handleChangePassword}
          disabled={changingPassword}
          colors={["#6366F1", "#4F46E5"]} />
        
      </BottomSheet>

      {}
      <BottomSheet
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}>
        
        <Text className="text-foreground text-xl font-bold mb-6">
          {t("profile.selectLanguage")}
        </Text>

        <Pressable
          className={`flex-row items-center p-4 rounded-xl mb-2 border ${
          currentLang === "ro" ?
          "bg-primary/[0.08] border-primary/30" :
          "bg-background border-border"}`
          }
          onPress={() => handleLanguageChange("ro")}>
          
          <Text className="text-2xl mr-3">🇷🇴</Text>
          <Text className="text-foreground font-medium flex-1">
            {t("profile.romanian")}
          </Text>
          {currentLang === "ro" &&
          <Ionicons name="checkmark-circle" size={22} color="#10B981" />
          }
        </Pressable>

        <Pressable
          className={`flex-row items-center p-4 rounded-xl border ${
          currentLang === "en" ?
          "bg-primary/[0.08] border-primary/30" :
          "bg-background border-border"}`
          }
          onPress={() => handleLanguageChange("en")}>
          
          <Text className="text-2xl mr-3">🇬🇧</Text>
          <Text className="text-foreground font-medium flex-1">
            {t("profile.english")}
          </Text>
          {currentLang === "en" &&
          <Ionicons name="checkmark-circle" size={22} color="#10B981" />
          }
        </Pressable>
      </BottomSheet>

      {}
      <BottomSheet
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}>
        
        <Text className="text-foreground text-xl font-bold mb-6">
          {t("profile.selectTheme")}
        </Text>

        {[
        {
          mode: "dark",
          label: t("profile.themeDark"),
          icon: "moon",
          desc: t("profile.themeDarkDesc")
        },
        {
          mode: "light",
          label: t("profile.themeLight"),
          icon: "sunny",
          desc: t("profile.themeLightDesc")
        }].
        map((opt) =>
        <Pressable
          key={opt.mode}
          className={`flex-row items-center p-4 rounded-xl mb-2 border ${
          themeMode === opt.mode ?
          "bg-primary/[0.08] border-primary/30" :
          "bg-background border-border"}`
          }
          onPress={() => {
            setTheme(opt.mode);
            setThemeModalVisible(false);
          }}>
          
            <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            style={{
              backgroundColor:
              themeMode === opt.mode ? "rgba(16,185,129,0.12)" : c.card
            }}>
            
              <Ionicons
              name={opt.icon}
              size={20}
              color={themeMode === opt.mode ? "#10B981" : "#6B7280"} />
            
            </View>
            <View className="flex-1">
              <Text className="text-foreground font-medium">{opt.label}</Text>
              <Text className="text-text-muted text-xs mt-0.5">{opt.desc}</Text>
            </View>
            {themeMode === opt.mode &&
          <Ionicons name="checkmark-circle" size={22} color="#10B981" />
          }
          </Pressable>
        )}
      </BottomSheet>

      {}
      <BottomSheet
        visible={helpModalVisible}
        onClose={() => setHelpModalVisible(false)}>
        
        <Text className="text-foreground text-xl font-bold mb-4">
          {t("profile.helpTitle")}
        </Text>

        <Text className="text-text-muted text-sm mb-4">
          {t("profile.helpDesc")}
        </Text>

        {}
        <Pressable
          className="flex-row items-center bg-background p-4 rounded-xl mb-4 border border-border active:opacity-70"
          onPress={() => Linking.openURL(`mailto:${t("profile.helpEmail")}`)}>
          
          <View className="w-9 h-9 rounded-xl overflow-hidden mr-3">
            <LinearGradient
              colors={["#10B981", "#6366F1"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 36,
                height: 36,
                alignItems: "center",
                justifyContent: "center"
              }}>
              
              <Ionicons name="mail" size={18} color="#fff" />
            </LinearGradient>
          </View>
          <Text className="text-primary font-medium flex-1">
            {t("profile.helpEmail")}
          </Text>
          <Ionicons name="open-outline" size={16} color="#6B7280" />
        </Pressable>

        {}
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

      {}
      <BottomSheet
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}>
        
        <Text className="text-foreground text-xl font-bold mb-4">
          {t("profile.termsTitle")}
        </Text>

        <View className="bg-background rounded-xl p-4 border border-border">
          <Text className="text-text-muted text-sm leading-6">
            {t("profile.termsContent")}
          </Text>
        </View>
      </BottomSheet>

      {}
      <BottomSheet
        visible={aboutModalVisible}
        onClose={() => setAboutModalVisible(false)}>
        
        {}
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
                justifyContent: "center"
              }}>
              
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
    </View>);

}