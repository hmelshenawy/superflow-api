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
  isAuthenticated: !!Cookies.get("access_token"),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<AuthTokens>("/auth/login", { email, password });
      const accessToken = data.access_token ?? data.accessToken;
      const refreshToken = data.refresh_token ?? data.refreshToken;
      if (!accessToken || !refreshToken) throw new Error("Missing auth tokens");
      Cookies.set("access_token", accessToken, { expires: 0.0104 });
      Cookies.set("refresh_token", refreshToken, { expires: 30 });
      const { data: me } = await api.get<User>("/auth/me");
      set({ user: me, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const { data } = await api.get<User>("/auth/me");
      set({ user: data, isAuthenticated: true });
    } catch {
      Cookies.remove("access_token");
      Cookies.remove("refresh_token");
      set({ user: null, isAuthenticated: false });
    }
  },
}));