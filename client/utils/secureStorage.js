/**
 * @fileoverview Cross-platform secure storage wrapper.
 * Uses expo-secure-store on native (iOS/Android) and localStorage on web.
 * The API mirrors expo-secure-store so it can be used as a drop-in replacement.
 */

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export async function getItemAsync(key) {
    if (Platform.OS === "web") {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }
    return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key, value) {
    if (Platform.OS === "web") {
        try {
            localStorage.setItem(key, value);
        } catch {
            // ignore
        }
        return;
    }
    return SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key) {
    if (Platform.OS === "web") {
        try {
            localStorage.removeItem(key);
        } catch {
            // ignore
        }
        return;
    }
    return SecureStore.deleteItemAsync(key);
}
