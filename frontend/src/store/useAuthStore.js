import { create } from "zustand"
import { persist } from "zustand/middleware"
import { fetchUser } from "@/services/authService"

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      isAuthenticated: () => {
        const state = useAuthStore.getState()
        return Boolean(state.token && state.user)
      },
      isAdmin: () => useAuthStore.getState().user?.role === "admin",
      isSeller: () => useAuthStore.getState().user?.role === "seller",
      isBuyer: () => useAuthStore.getState().user?.role === "buyer",
      refreshUser: async () => {
        if (!get().token) return
        await fetchUser()
      },
    }),
    {
      name: "arood-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
