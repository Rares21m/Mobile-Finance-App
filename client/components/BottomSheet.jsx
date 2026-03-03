/**
 * @fileoverview Reusable bottom sheet modal with backdrop dismiss
 * and built-in cancel button. Used in the profile screen.
 */

import { Modal, Pressable, Text, View } from "react-native";

import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";

/**
 * Reusable bottom sheet modal used across the profile screen.
 *
 * @param {boolean}   visible  - Controls modal visibility
 * @param {Function}  onClose  - Called on dismiss
 * @param {ReactNode} children - Bottom sheet content
 */
export default function BottomSheet({ visible, onClose, children }) {
    const { t } = useTranslation();
    const { theme } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable
                className="flex-1"
                style={{ backgroundColor: theme.colors.overlay }}
                onPress={onClose}
            >
                <View className="flex-1" />
            </Pressable>
            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: theme.colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    paddingHorizontal: 24,
                    paddingTop: 24,
                    paddingBottom: 40,
                }}
            >
                <View
                    style={{
                        width: 40,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: theme.colors.handle,
                        alignSelf: "center",
                        marginBottom: 20,
                    }}
                />
                {children}
                <Pressable
                    className="mt-4 py-3 items-center active:opacity-70"
                    onPress={onClose}
                >
                    <Text style={{ color: theme.colors.textMuted, fontWeight: "500", fontSize: 14 }}>
                        {t("common.cancel")}
                    </Text>
                </Pressable>
            </View>
        </Modal>
    );
}

