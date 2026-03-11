/**
 * @fileoverview Authentication context and provider for the Novence app.
 * Manages JWT persistence (via expo-secure-store), auto-login on startup,
 * and automatic route protection (redirect logic).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import * as SplashScreen from "expo-splash-screen";
import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import * as SecureStore from "../utils/secureStorage";

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // On startup, check whether we have a saved token
  useEffect(() => {
    async function loadToken() {
      let savedToken = null;
      let savedUser = null;
      try {
        savedToken = await SecureStore.getItemAsync("jwt_token");
        savedUser = await SecureStore.getItemAsync("user_data");
      } catch (err) {
        console.error("Error loading token:", err);
      } finally {
        await SplashScreen.hideAsync(); // ascunde splash nativ imediat → apare CircularLoading
        await new Promise((resolve) => setTimeout(resolve, 3000)); // CircularLoading stă 3s
        // Setăm token-ul DUPĂ delay, ca redirect-ul să nu se întâmple prematur
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
        setIsLoading(false);
        setShowSplash(false);
      }
    }
    loadToken();
  }, []);

  // Check biometric availability once on mount
  useEffect(() => {
    async function checkBiometrics() {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(hasHardware && isEnrolled);
        const flag = await AsyncStorage.getItem("biometric_enabled");
        setBiometricEnabled(flag === "true");
      } catch (err) {
        console.error("Biometric check error:", err);
      }
    }
    checkBiometrics();
  }, []);

  async function login(email, password) {
    const response = await api.post("/auth/login", { email, password });
    const { token: jwt, user: userData } = response.data;

    await SecureStore.setItemAsync("jwt_token", jwt);
    await SecureStore.setItemAsync("user_data", JSON.stringify(userData));

    setToken(jwt);
    setUser(userData);

    return userData;
  }

  async function register(email, password, name) {
    const response = await api.post("/auth/register", {
      email,
      password,
      name,
    });
    const { token: jwt, user: userData } = response.data;

    await SecureStore.setItemAsync("jwt_token", jwt);
    await SecureStore.setItemAsync("user_data", JSON.stringify(userData));

    setToken(jwt);
    setUser(userData);

    return userData;
  }

  async function updateUser(data) {
    const response = await api.put("/auth/profile", data);
    const updatedUser = response.data.user;
    await SecureStore.setItemAsync("user_data", JSON.stringify(updatedUser));
    setUser(updatedUser);
    return updatedUser;
  }

  async function logout() {
    await SecureStore.deleteItemAsync("jwt_token");
    await SecureStore.deleteItemAsync("user_data");
    setToken(null);
    setUser(null);
  }

  // Prompts biometric to confirm identity, then stores credentials securely
  async function enableBiometric(email, password) {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage:
        "Confirmă identitatea pentru a activa autentificarea biometrică",
      cancelLabel: "Anulează",
      disableDeviceFallback: false,
    });
    if (!result.success) return false;
    await SecureStore.setItemAsync(
      "biometric_credentials",
      JSON.stringify({ email, password }),
    );
    await AsyncStorage.setItem("biometric_enabled", "true");
    setBiometricEnabled(true);
    return true;
  }

  async function disableBiometric() {
    await SecureStore.deleteItemAsync("biometric_credentials");
    await AsyncStorage.setItem("biometric_enabled", "false");
    setBiometricEnabled(false);
  }

  // Prompts biometric then logs in using stored credentials
  async function loginWithBiometric() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Autentificare biometrică",
      cancelLabel: "Anulează",
      disableDeviceFallback: false,
    });
    if (!result.success) {
      const err = new Error(
        result.error === "user_cancel"
          ? "BIOMETRIC_CANCELLED"
          : "BIOMETRIC_FAILED",
      );
      err.code = err.message;
      throw err;
    }
    const stored = await SecureStore.getItemAsync("biometric_credentials");
    if (!stored) {
      await disableBiometric();
      throw new Error("BIOMETRIC_NO_CREDENTIALS");
    }
    const { email, password } = JSON.parse(stored);
    return login(email, password);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        showSplash,
        biometricEnabled,
        biometricAvailable,
        login,
        register,
        logout,
        updateUser,
        enableBiometric,
        disableBiometric,
        loginWithBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
