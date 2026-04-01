import { useEffect } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import * as authService from "@/services/authService"

/**
 * Fetches fresh user data (including permissions) when app loads with existing token.
 */
export function AuthInit() {
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (token) {
      authService.fetchUser().catch(() => {})
    }
  }, [token])

  return null
}
