/**
 * @fileoverview Glass-styled text input with icon, label, and error
 * message support. Used in the sign-in and sign-up forms.
 */

import { Text, TextInput, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

/**
 * Glass-styled text input used in auth screens.
 *
 * @param {string}   label        - Field label
 * @param {string}   icon         - Ionicons icon name
 * @param {string}   value        - Current value
 * @param {Function} onChangeText - Change handler
 * @param {string}   [placeholder]
 * @param {string}   [error]      - Error message (shown below input)
 * @param {boolean}  [isLast]     - If true, uses mb-6 after error/spacer
 * @param {object}   [inputProps] - Extra TextInput props (secureTextEntry, keyboardType, etc.)
 */
export default function GlassInput({
    label,
    icon,
    value,
    onChangeText,
    placeholder,
    error,
    isLast = false,
    ...inputProps
}) {
    const spacerClass = isLast ? "mb-6" : "mb-4";

    return (
        <>
            <Text className="text-gray-300 text-sm font-medium mb-2">
                {label}
            </Text>
            <View className="flex-row items-center bg-white/[0.06] rounded-2xl border border-white/[0.08] mb-1 px-4">
                <Ionicons name={icon} size={18} color="#6B7280" />
                <TextInput
                    className="flex-1 text-white py-4 ml-3 text-sm"
                    placeholder={placeholder}
                    placeholderTextColor="#4B5563"
                    value={value}
                    onChangeText={onChangeText}
                    {...inputProps}
                />
            </View>
            {error ? (
                <Text className={`text-expense text-xs ${isLast ? "mb-6" : "mb-3"} ml-1`}>
                    {error}
                </Text>
            ) : (
                <View className={spacerClass} />
            )}
        </>
    );
}
