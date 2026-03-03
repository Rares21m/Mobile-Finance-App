/**
 * @fileoverview Authentication context and provider for the Novence app.
 * Manages JWT persistence (via expo-secure-store), auto-login on startup,
 * and automatic route protection (redirect logic).
 */

import { useRouter, useSegments } from "expo-router";
import * as SecureStore from "../utils/secureStorage";
import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import CircularLoading from "../components/CircularLoading";

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
    const router = useRouter();
    const segments = useSegments();

    // On startup, check whether we have a saved token
    useEffect(() => {
        async function loadToken() {
            try {
                const savedToken = await SecureStore.getItemAsync("jwt_token");
                const savedUser = await SecureStore.getItemAsync("user_data");
                if (savedToken && savedUser) {
                    // Instant auto-login — no artificial delay
                    setToken(savedToken);
                    setUser(JSON.parse(savedUser));
                }
            } catch (err) {
                console.error("Error loading token:", err);
            } finally {
                setIsLoading(false);
                setShowSplash(false);
            }
        }
        loadToken();
    }, []);

    // Auto-redirect based on authentication state
    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === "(auth)";

        if (!token && !inAuthGroup) {
            // Not logged in → redirect to welcome
            router.replace("/(auth)/welcome");
        } else if (token && inAuthGroup) {
            // Logged in → redirect to tabs
            router.replace("/(tabs)");
        }
    }, [token, segments, isLoading]);

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
        const response = await api.post("/auth/register", { email, password, name });
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

    // Show splash screen while checking for saved token
    if (showSplash) {
        return <CircularLoading />;
    }

    return (
        <AuthContext.Provider
            value={{ user, token, isLoading, login, register, logout, updateUser }}
        >
            {children}
        </AuthContext.Provider>
    );
}
