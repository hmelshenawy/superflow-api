import axios, { type AxiosError } from "axios";
import type { ApiErrorResponse, ErrorCode } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

export function getAccessToken() {
  return accessToken;
}

export async function refreshAccessToken() {
  const { data } = await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
  const token = data.accessToken ?? data.access_token;
  if (!token) throw new Error("Missing access token");
  setAccessToken(token);
  return token;
}

export function getApiError(err: unknown): { code: ErrorCode; message: string; statusCode: number; details?: Record<string, unknown> } {
  if (axios.isAxiosError(err)) {
    const d = (err as AxiosError<ApiErrorResponse>).response?.data;
    if (d?.code) {
      return { code: d.code, message: d.message, statusCode: d.statusCode, details: d.details };
    }
  }
  return { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "An unexpected error occurred", statusCode: 500 };
}

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ─── Interceptors ────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = original.url?.includes("/auth/login") || original.url?.includes("/auth/refresh") || original.url?.includes("/auth/select-workshop");
    const apiErr = getApiError(error);

    // Redirect to workshop selector if no workshop context
    if (apiErr.code === "AUTH_WORKSHOP_REQUIRED" && typeof window !== "undefined") {
      window.location.href = "/select-workshop";
      return Promise.reject(error);
    }

    // Don't try to refresh on auth endpoints or non-401 errors
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        clearAccessToken();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
