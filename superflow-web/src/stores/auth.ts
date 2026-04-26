import { create } from "zustand";
import Cookies from "js-cookie";
import type { User, AuthTokens } from "@/types";
import api from "@/lib/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<AuthTokens>("/auth/login", { email, password });
      const accessToken = data.access_token ?? data.accessToken;
      const refreshToken = data.access_token ?? data.refreshToken;
      if (!accessToken || !refreshToken) throw new Error("Missing auth tokens");
      // Access token: 8h (0.33 days) to match JWT expiry; Refresh token: 30 days
      Cookies.set("access_token", accessToken, { expires: 0.33, path: "/", sameSite: "lax" });
      Cookies.set("refresh_token", refreshToken, { expires: 30, path: "/", sameSite: "lax" });
      const { data: me } = await api.get<User>("/auth/me");
      set({ user: me, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    Cookies.remove("access_token", { path: "/" });
    Cookies.remove("refresh_token", { path: "/" });
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const { data } = await api.get<User>("/auth/me");
      set({ user: data, isAuthenticated: true });
    } catch {
      Cookies.remove("access_token", { path: "/" });
      Cookies.remove("refresh_token", { path: "/" });
      set({ user: null, isAuthenticated: false });
    }
  },
}));