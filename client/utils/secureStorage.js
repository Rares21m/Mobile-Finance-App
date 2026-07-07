
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export async function getItemAsync(key, options = {}) {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key, options);
}

export async function setItemAsync(key, value, options = {}) {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(key, value);
    } catch {

    }
    return;
  }
  return SecureStore.setItemAsync(key, value, options);
}

export async function deleteItemAsync(key) {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(key);
    } catch {

    }
    return;
  }
  return SecureStore.deleteItemAsync(key);
}