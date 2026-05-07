import axios from "axios";
import Cookies from "js-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// ─── Interceptors ────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = original.url?.includes("/auth/login") || original.url?.includes("/auth/refresh") || original.url?.includes("/auth/select-workshop");

    // Redirect to workshop selector if no workshop is selected
    if (error.response?.status === 403 && error.response?.data?.message?.includes("No workshop selected") && typeof window !== "undefined") {
      window.location.href = "/select-workshop";
      return Promise.reject(error);
    }

    // Don't try to refresh on auth endpoints or non-401 errors
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      const refreshToken = Cookies.get("refresh_token");
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
            refreshToken,
          });
          Cookies.set("access_token", data.accessToken, { expires: 0.33, path: "/", sameSite: "lax", secure: window.location.protocol === "https:" });
          Cookies.set("refresh_token", data.refreshToken, { expires: 30, path: "/", sameSite: "lax", secure: window.location.protocol === "https:" });
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          Cookies.remove("access_token", { path: "/" });
          Cookies.remove("refresh_token", { path: "/" });
          window.location.href = "/login";
        }
      } else {
        Cookies.remove("access_token", { path: "/" });
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;