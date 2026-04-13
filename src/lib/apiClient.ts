// =============================================================================
// DENTAL CMS — Infrastructure: Axios API Client
// src/lib/apiClient.ts
//
// Configured Axios instance. All feature-level API services import from here.
// Set NEXT_PUBLIC_API_URL in .env to point at your real backend.
// Set NEXT_PUBLIC_USE_MOCK_API=true to bypass HTTP calls and use localStorage.
// =============================================================================

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

export const USE_MOCK_API =
  process.env.NEXT_PUBLIC_USE_MOCK_API === "true" ||
  !process.env.NEXT_PUBLIC_API_URL;

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

// ---------------------------------------------------------------------------
// Token helper (simple sessionStorage approach — swap for cookies on SSR)
// ---------------------------------------------------------------------------

export const tokenStorage = {
  get: (): string | null => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("smilecraft_token");
  },
  set: (token: string): void => {
    if (typeof window !== "undefined") sessionStorage.setItem("smilecraft_token", token);
  },
  clear: (): void => {
    if (typeof window !== "undefined") sessionStorage.removeItem("smilecraft_token");
  },
};

// ---------------------------------------------------------------------------
// Axios Instance
// ---------------------------------------------------------------------------

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token
// ---------------------------------------------------------------------------

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.get();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response interceptor — 401 guard + normalised error
// ---------------------------------------------------------------------------

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      tokenStorage.clear();
      // Redirect to login without importing Next.js router (avoids circular deps)
      if (typeof window !== "undefined") {
        window.location.href = "/ar/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
