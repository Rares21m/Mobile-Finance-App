/**
 * @fileoverview Axios-based HTTP client for the Novence API.
 * Automatically attaches the JWT token from SecureStore to every request.
 * Base URL is configurable via app.config.js (EXPO_PUBLIC_API_URL).
 */

import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "../utils/secureStorage";

function getHostFromExpoRuntime() {
  const hostUri =
  Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;

  if (!hostUri) {
    return null;
  }

  return hostUri.split(":")[0] || null;
}


const BASE_URL = (() => {
  const configuredApiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (configuredApiUrl) {
    return configuredApiUrl;
  }

  const host = getHostFromExpoRuntime();
  if (host) {
    return `http://${host}:3000/api`;
  }

  return "http://localhost:3000/api";
})();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

function createIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function needsIdempotencyHeader(config) {
  const method = (config.method || "get").toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return false;
  }

  const url = config.url || "";
  return (
    url.startsWith("/manual") ||
    url.startsWith("/budgets/limits") ||
    url.startsWith("/budgets/events"));

}


api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("jwt_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (needsIdempotencyHeader(config) && !config.headers["idempotency-key"]) {
    config.headers["idempotency-key"] = createIdempotencyKey();
  }

  return config;
});


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