/**
 * @fileoverview Redesigned Inbox modal — premium notification center
 * with date grouping, card-based layout, and interactive actions.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Platform } from
"react-native";
import { useNotifications } from "../context/NotificationsContext";
import { useTheme } from "../context/ThemeContext";

const TYPE_META = {
  budget_warning: { icon: "warning", color: "#F59E0B", gradient: ["#F59E0B", "#D97706"] },
  budget_over: { icon: "alert-circle", color: "#F43F5E", gradient: ["#F43F5E", "#E11D48"] },
  badge_earned: { icon: "trophy", color: "#10B981", gradient: ["#10B981", "#059669"] },
  monthly_checkin: { icon: "calendar", color: "#6366F1", gradient: ["#6366F1", "#4F46E5"] },
  weekly_digest: { icon: "trending-up", color: "#3B82F6", gradient: ["#3B82F6", "#2563EB"] }
};

function formatRelativeTime(timestamp, lang) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  const isRo = lang?.startsWith("ro");
  if (minutes < 2) return isRo ? "acum " : "just now";
  if (minutes < 60) return isRo ? `acum ${minutes} min` : `${minutes}m ago`;
  if (hours < 24) return isRo ? `acum ${hours}h` : `${hours}h ago`;
  if (days < 7) return isRo ? `acum ${days}z` : `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(isRo ? "ro-RO" : "en-US", {
    day: "numeric",
    month: "short"
  });
}

function NotificationCard({ item, onPress, onModalClose, c, t, isDark }) {
  const router = useRouter();
  const meta = TYPE_META[item.type] || {
    icon: "notifications",
    color: c.primary,
    gradient: [c.primary, c.primaryDark]
  };

  const handleAction = () => {
    onPress(item.id);
    onModalClose();

    if (item.type.startsWith("budget")) {
      router.push("/(tabs)/budget");
    } else if (item.type === "monthly_checkin" || item.type === "weekly_digest") {
      router.push("/(tabs)/analytics");
    } else {
      router.push("/transactions");
    }
  };

  return (
    <Pressable
      onPress={handleAction}
      style={({ pressed }) => ({
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 20,
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
        borderWidth: 1,
        borderColor: !item.read ?
        `${meta.color}40` :
        isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
        overflow: "hidden",
        opacity: pressed ? 0.9 : 1,
        elevation: item.read ? 0 : 2,
        shadowColor: meta.color,
        shadowOffset: { width: 0, shadowHeight: 4 },
        shadowOpacity: item.read ? 0 : 0.1,
        shadowRadius: 8
      })}>
      
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
          {}
          <View style={{ width: 44, height: 44, borderRadius: 14, overflow: "hidden", marginRight: 14 }}>
            <LinearGradient
              colors={meta.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              
              <Ionicons name={meta.icon} size={22} color="white" />
            </LinearGradient>
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <Text
                style={{
                  color: !item.read ? c.foreground : c.textMuted,
                  fontSize: 14,
                  fontWeight: "800",
                  flex: 1,
                  marginRight: 8
                }}
                numberOfLines={1}>
                
                {item.title}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: "600" }}>
                {formatRelativeTime(item.timestamp, item.lang)}
              </Text>
            </View>
            <Text
              style={{ color: item.read ? c.textMuted : c.foreground, fontSize: 13, lineHeight: 18, opacity: item.read ? 0.7 : 0.9 }}
              numberOfLines={3}>
              
              {item.body}
            </Text>
          </View>
        </View>

        {}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", paddingTop: 12, marginTop: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {!item.read &&
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: meta.color, marginRight: 8 }} />
            }
            <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "600" }}>
              {!item.read ? t("inbox.new") : t("inbox.read")}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={handleAction}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"
            }}>
            
            <Text style={{ color: c.foreground, fontSize: 12, fontWeight: "700" }}>
              {t("common.view")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>);

}

export default function InboxModal({ visible, onClose }) {
  const { isDark, theme } = useTheme();
  const c = theme.colors;
  const { t } = useTranslation();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
  useNotifications();


  const groupedData = useMemo(() => {
    if (!notifications || notifications.length === 0) return [];

    const today = [];
    const yesterday = [];
    const older = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;

    notifications.forEach((n) => {
      const ts = Number(n.timestamp);
      if (ts >= todayStart) today.push(n);else
      if (ts >= yesterdayStart) yesterday.push(n);else
      older.push(n);
    });

    const result = [];
    if (today.length > 0) {
      result.push({ type: "group", label: t("common.today"), id: "grp-today" });
      today.forEach((n) => result.push({ ...n, type: "notification" }));
    }
    if (yesterday.length > 0) {
      result.push({ type: "group", label: t("common.yesterday"), id: "grp-yesterday" });
      yesterday.forEach((n) => result.push({ ...n, type: "notification" }));
    }
    if (older.length > 0) {
      result.push({ type: "group", label: t("common.older"), id: "grp-older" });
      older.forEach((n) => result.push({ ...n, type: "notification" }));
    }
    return result;
  }, [notifications, t]);

  const handleRowPress = useCallback((id) => markAsRead(id), [markAsRead]);

  const renderItem = useCallback(
    ({ item }) => {
      if (item.type === "group") {
        return (
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
            <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 }}>
              {item.label}
            </Text>
          </View>);

      }
      return (
        <NotificationCard
          item={item}
          onPress={handleRowPress}
          onModalClose={onClose}
          c={c}
          t={t}
          isDark={isDark} />);


    },
    [handleRowPress, c, t, isDark]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        
        {}
        <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)" }} />
        </View>

        {}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 24,
            paddingVertical: 16
          }}>
          
          <View>
            <Text style={{ color: c.foreground, fontSize: 24, fontWeight: "900", letterSpacing: -0.5 }}>
              {t("inbox.title")}
            </Text>
            {unreadCount > 0 &&
            <Text style={{ color: c.primary, fontSize: 13, fontWeight: "700", marginTop: 2 }}>
                {unreadCount} {t("inbox.unreadSuffix", { count: unreadCount })}
              </Text>
            }
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            {unreadCount > 0 &&
            <TouchableOpacity
              onPress={markAllAsRead}
              style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${c.primary}15`, alignItems: "center", justifyContent: "center" }}>
              
                <Ionicons name="checkmark-done" size={20} color={c.primary} />
              </TouchableOpacity>
            }
            {notifications.length > 0 &&
            <TouchableOpacity
              onPress={clearAll}
              style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
              
                <Ionicons name="trash-outline" size={20} color={c.textMuted} />
              </TouchableOpacity>
            }
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
              
              <Ionicons name="close" size={22} color={c.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {}
        {notifications.length === 0 ?
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <Ionicons name="notifications-off" size={44} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"} />
            </View>
            <Text style={{ color: c.foreground, fontSize: 20, fontWeight: "800", marginBottom: 8, textAlign: "center" }}>
              {t("inbox.emptyTitle")}
            </Text>
            <Text style={{ color: c.textMuted, fontSize: 15, textAlign: "center", lineHeight: 22 }}>
              {t("inbox.emptyDesc")}
            </Text>
          </View> :

        <FlatList
          data={groupedData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false} />

        }
      </View>
    </Modal>);

}