import { Navigate } from "react-router-dom"
import { useAuthStore } from "@/store/useAuthStore"
import { publicProfilePath } from "@/lib/profileRoutes"

/**
 * Alias route `/dashboard/account`; redirects to the member's public profile hub.
 */
export function AccountSettingsPage() {
  const { user } = useAuthStore()
  return <Navigate to={publicProfilePath(user) ?? "/dashboard"} replace />
}
