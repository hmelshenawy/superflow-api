import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, AuthTokens, Workshop } from "@/types";
import api, { clearAccessToken, setAccessToken } from "@/lib/api";

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
        clearAccessToken();
        set({ isLoading: true });
        try {
          const { data } = await api.post<AuthTokens & { workshops?: Workshop[]; workshopId?: string }>("/auth/login", { email, password });
          const accessToken = data.access_token ?? data.accessToken;
          if (!accessToken) throw new Error("Missing access token");
          setAccessToken(accessToken);

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
        // Access tokens are memory-only, so a refreshed/reloaded tab may not
        // have a bearer token when the user logs out. Clear local state either way.
        api.post("/auth/logout").catch(() => undefined);
        clearAccessToken();
        localStorage.removeItem("currentWorkshopId");
        set({ user: null, isAuthenticated: false, workshops: [], currentWorkshopId: null });
      },

      loadUser: async () => {
        try {
          const { data } = await api.get<User & { workshops?: Workshop[] }>("/auth/me");
          const savedWorkshopId = localStorage.getItem("currentWorkshopId");
          set({ user: data, isAuthenticated: true, currentWorkshopId: savedWorkshopId, workshops: data.workshops ?? get().workshops });
        } catch {
          clearAccessToken();
          set({ user: null, isAuthenticated: false });
        }
      },

      selectWorkshop: async (workshopId) => {
        try {
          const { data } = await api.post<{ accessToken: string; workshop: Workshop }>("/auth/select-workshop", { workshopId });
          setAccessToken(data.accessToken);
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
