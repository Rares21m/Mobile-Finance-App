/**
 * @fileoverview Reusable bottom sheet modal with backdrop dismiss
 * and built-in cancel button. Used in the profile screen.
 */

import { Modal, Pressable, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

/**
 * Reusable bottom sheet modal used across the profile screen.
 *
 * @param {boolean}   visible  - Controls modal visibility
 * @param {Function}  onClose  - Called on dismiss
 * @param {ReactNode} children - Bottom sheet content
 */
export default function BottomSheet({ visible, onClose, children }) {
    const { t } = useTranslation();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable
                className="flex-1"
                style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                onPress={onClose}
            >
                <View className="flex-1" />
            </Pressable>
            <View
                className="bg-dark-surface rounded-t-3xl px-6 pb-10 pt-6 border-t border-dark-border"
                style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
            >
                <View className="w-10 h-1 rounded-full bg-gray-700 self-center mb-5" />
                {children}
                <Pressable
                    className="mt-4 py-3 items-center active:opacity-70"
                    onPress={onClose}
                >
                    <Text className="text-gray-500 font-medium text-sm">
                        {t("common.cancel")}
                    </Text>
                </Pressable>
            </View>
        </Modal>
    );
}
