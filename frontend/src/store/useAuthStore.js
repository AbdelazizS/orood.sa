import { create } from "zustand"
import { persist } from "zustand/middleware"

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      isAuthenticated: () => {
        const state = useAuthStore.getState()
        return Boolean(state.token && state.user)
      },
      isAdmin: () => useAuthStore.getState().user?.role === "admin",
      isSeller: () => useAuthStore.getState().user?.role === "seller",
      isBuyer: () => useAuthStore.getState().user?.role === "buyer",
    }),
    { name: "arood-auth" },
  ),
)
