/**
 * @fileoverview Axios-based HTTP client for the Novence API.
 * Automatically attaches the JWT token from SecureStore to every request.
 * Base URL is configurable via app.config.js (EXPO_PUBLIC_API_URL).
 */

import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "../utils/secureStorage";

// Backend URL — configured via app.config.js > extra.apiUrl
// Falls back to localhost for development
const BASE_URL =
    Constants.expoConfig?.extra?.apiUrl || "http://localhost:3000/api";

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Interceptor: attach JWT token to every request
api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync("jwt_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor: delete token only when JWT is truly expired/invalid (not on every 401)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const errCode = error.response?.data?.error;
        if (error.response?.status === 401 && errCode === "TOKEN_EXPIRED_OR_INVALID") {
            await SecureStore.deleteItemAsync("jwt_token");
        }
        return Promise.reject(error);
    }
);

export default api;
