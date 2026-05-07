import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";
import type { User, AuthTokens, Workshop } from "@/types";
import api from "@/lib/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  workshops: Workshop[];
  currentWorkshopId: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  selectWorkshop: (workshopId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      workshops: [],
      currentWorkshopId: null,

      login: async (email, password) => {
        Cookies.remove("access_token", { path: "/" });
        Cookies.remove("refresh_token", { path: "/" });
        set({ isLoading: true });
        try {
          const { data } = await api.post<AuthTokens & { workshops?: Workshop[]; workshopId?: string }>("/auth/login", { email, password });
          const accessToken = data.access_token ?? data.accessToken;
          const refreshToken = data.refresh_token ?? data.refreshToken;
          if (!accessToken || !refreshToken) throw new Error("Missing auth tokens");
          Cookies.set("access_token", accessToken, { expires: 0.33, path: "/", sameSite: "lax", secure: window.location.protocol === "https:" });
          Cookies.set("refresh_token", refreshToken, { expires: 30, path: "/", sameSite: "lax", secure: window.location.protocol === "https:" });

          const workshops = data.workshops ?? [];
          const currentWorkshopId = data.workshopId ?? null;

          if (currentWorkshopId) {
            localStorage.setItem("currentWorkshopId", currentWorkshopId);
          }

          const { data: me } = await api.get<User>("/auth/me");
          set({ user: me, isAuthenticated: true, isLoading: false, workshops, currentWorkshopId });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        Cookies.remove("access_token", { path: "/" });
        Cookies.remove("refresh_token", { path: "/" });
        localStorage.removeItem("currentWorkshopId");
        set({ user: null, isAuthenticated: false, workshops: [], currentWorkshopId: null });
      },

      loadUser: async () => {
        try {
          const { data } = await api.get<User & { workshops?: Workshop[] }>("/auth/me");
          const savedWorkshopId = localStorage.getItem("currentWorkshopId");
          set({ user: data, isAuthenticated: true, currentWorkshopId: savedWorkshopId, workshops: data.workshops ?? get().workshops });
        } catch {
          Cookies.remove("access_token", { path: "/" });
          Cookies.remove("refresh_token", { path: "/" });
          set({ user: null, isAuthenticated: false });
        }
      },

      selectWorkshop: async (workshopId) => {
        try {
          const { data } = await api.post<{ accessToken: string; workshop: Workshop }>("/auth/select-workshop", { workshopId });
          Cookies.set("access_token", data.accessToken, { expires: 0.33, path: "/", sameSite: "lax", secure: window.location.protocol === "https:" });
          localStorage.setItem("currentWorkshopId", workshopId);
          set({ currentWorkshopId: workshopId });
          window.location.reload();
        } catch (err) {
          console.error("Failed to select workshop", err);
          throw err;
        }
      },
    }),
    {
      name: "superflow-auth",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated, workshops: state.workshops, currentWorkshopId: state.currentWorkshopId }),
    },
  ),
);