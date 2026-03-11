/**
 * @fileoverview Inbox modal — shows the full history of in-app notifications
 * (budget alerts, badge earned, monthly check-in).
 * Opened by the bell icon in the home header.
 */

import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNotifications } from "../context/NotificationsContext";
import { useTheme } from "../context/ThemeContext";

// Map notification type → Ionicons name + colour
const TYPE_META = {
  budget_warning: { icon: "warning-outline", color: "#F59E0B" },
  budget_over: { icon: "alert-circle-outline", color: "#F43F5E" },
  badge_earned: { icon: "trophy-outline", color: "#10B981" },
  monthly_checkin: { icon: "calendar-outline", color: "#6366F1" },
};

function formatRelativeTime(timestamp, lang) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  const isRo = lang?.startsWith("ro");
  if (minutes < 2) return isRo ? "acum" : "just now";
  if (minutes < 60) return isRo ? `acum ${minutes} min` : `${minutes}m ago`;
  if (hours < 24) return isRo ? `acum ${hours}h` : `${hours}h ago`;
  if (days < 7) return isRo ? `acum ${days}z` : `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(isRo ? "ro-RO" : "en-US", {
    day: "numeric",
    month: "short",
  });
}

function NotificationRow({ item, onPress, c }) {
  const meta = TYPE_META[item.type] || {
    icon: "notifications-outline",
    color: c.primary,
  };

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "flex-start",
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: item.read ? "transparent" : `${meta.color}10`,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {/* Unread dot */}
      <View style={{ width: 8, alignItems: "center", paddingTop: 5 }}>
        {!item.read && (
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: meta.color,
            }}
          />
        )}
      </View>

      {/* Icon bubble */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: `${meta.color}20`,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          marginLeft: 4,
        }}
      >
        <Ionicons name={meta.icon} size={18} color={meta.color} />
      </View>

      {/* Text */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: c.foreground,
            fontSize: 13,
            fontWeight: item.read ? "400" : "600",
            marginBottom: 2,
          }}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <Text
          style={{ color: c.textMuted, fontSize: 12, lineHeight: 17 }}
          numberOfLines={3}
        >
          {item.body}
        </Text>
      </View>

      {/* Timestamp */}
      <Text
        style={{
          color: c.textMuted,
          fontSize: 11,
          marginLeft: 8,
          marginTop: 2,
          flexShrink: 0,
        }}
      >
        {formatRelativeTime(item.timestamp, item.lang)}
      </Text>
    </Pressable>
  );
}

export default function InboxModal({ visible, onClose }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { t, i18n } = useTranslation();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
    useNotifications();

  const handleRowPress = useCallback((id) => markAsRead(id), [markAsRead]);

  const renderItem = useCallback(
    ({ item }) => (
      <NotificationRow item={item} onPress={handleRowPress} c={c} />
    ),
    [handleRowPress, c],
  );

  const renderSeparator = useCallback(
    () => (
      <View style={{ height: 1, backgroundColor: c.border, marginLeft: 72 }} />
    ),
    [c],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: c.background }}>
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
          }}
        >
          {/* Left: close */}
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={c.foreground} />
          </TouchableOpacity>

          {/* Title */}
          <Text
            style={{
              color: c.foreground,
              fontSize: 17,
              fontWeight: "700",
            }}
          >
            {t("inbox.title")}
            {unreadCount > 0 && (
              <Text style={{ color: c.primary, fontWeight: "700" }}>
                {" "}
                ({unreadCount})
              </Text>
            )}
          </Text>

          {/* Right: actions */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllAsRead} hitSlop={10}>
                <Ionicons
                  name="checkmark-done-outline"
                  size={22}
                  color={c.primary}
                />
              </TouchableOpacity>
            )}
            {notifications.length > 0 && (
              <TouchableOpacity onPress={clearAll} hitSlop={10}>
                <Ionicons name="trash-outline" size={20} color={c.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── List ── */}
        {notifications.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingBottom: 80,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: `${c.primary}18`,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons
                name="notifications-off-outline"
                size={30}
                color={c.primary}
              />
            </View>
            <Text
              style={{
                color: c.foreground,
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 6,
              }}
            >
              {t("inbox.emptyTitle")}
            </Text>
            <Text
              style={{
                color: c.textMuted,
                fontSize: 13,
                textAlign: "center",
                maxWidth: 260,
                lineHeight: 19,
              }}
            >
              {t("inbox.emptyDesc")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={renderSeparator}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
}
