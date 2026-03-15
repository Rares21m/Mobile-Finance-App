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
export default function BottomSheet({ visible, onClose, children, size = "md" }) {
    const { t } = useTranslation();
    const { theme, tokens } = useTheme();

    const SIZE_MAP = {
        sm: { horizontal: 20, top: 20, bottom: 28 },
        md: { horizontal: 24, top: 24, bottom: 40 },
        lg: { horizontal: 24, top: 28, bottom: 48 },
    };

    const resolvedSize = SIZE_MAP[size] || SIZE_MAP.md;

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
                    borderTopLeftRadius: tokens.radius.xl,
                    borderTopRightRadius: tokens.radius.xl,
                    paddingHorizontal: resolvedSize.horizontal,
                    paddingTop: resolvedSize.top,
                    paddingBottom: resolvedSize.bottom,
                }}
            >
                <View
                    style={{
                        width: 40,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: theme.colors.handle,
                        alignSelf: "center",
                        marginBottom: tokens.spacing.lg,
                    }}
                />
                {children}
                <Pressable
                    className="mt-4 py-3 items-center active:opacity-70"
                    onPress={onClose}
                >
                    <Text
                        style={{
                            color: theme.colors.textMuted,
                            fontWeight: "500",
                            fontSize: tokens.typography.sizes.sm,
                        }}
                    >
                        {t("common.cancel")}
                    </Text>
                </Pressable>
            </View>
        </Modal>
    );
}

