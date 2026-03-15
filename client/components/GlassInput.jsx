/**
 * @fileoverview Glass-styled text input with icon, label, and error
 * message support. Used in the sign-in and sign-up forms.
 */

import { Text, TextInput, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

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
    success,
    isLast = false,
    inputStyle,
    containerStyle,
    ...inputProps
}) {
    const { theme, tokens } = useTheme();
    const c = theme.colors;
    const spacerClass = isLast ? "mb-6" : "mb-4";

    const borderColor = error
        ? c.expense
        : success
            ? c.success
            : c.border;

    return (
        <>
            <Text
                style={{
                    color: c.textMuted,
                    fontSize: tokens.typography.sizes.sm,
                    fontWeight: "500",
                    marginBottom: tokens.spacing.sm,
                }}
            >
                {label}
            </Text>
            <View
                className="flex-row items-center rounded-2xl border mb-1 px-4"
                style={[
                    {
                        backgroundColor: c.card,
                        borderColor,
                    },
                    containerStyle,
                ]}
            >
                <Ionicons name={icon} size={18} color={c.textMuted} />
                <TextInput
                    className="flex-1 py-4 ml-3"
                    style={[
                        {
                            color: c.foreground,
                            fontSize: tokens.typography.sizes.sm,
                        },
                        inputStyle,
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={c.placeholder}
                    value={value}
                    onChangeText={onChangeText}
                    {...inputProps}
                />
            </View>
            {error ? (
                <Text
                    className={`${isLast ? "mb-6" : "mb-3"} ml-1`}
                    style={{ color: c.expense, fontSize: tokens.typography.sizes.xs }}
                >
                    {error}
                </Text>
            ) : (
                <View className={spacerClass} />
            )}
        </>
    );
}
