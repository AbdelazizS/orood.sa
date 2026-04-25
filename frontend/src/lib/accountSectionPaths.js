import { useLocation } from "react-router-dom"
import { useAuthStore } from "@/store/useAuthStore"

const ADMIN_ROLES = new Set(["super_admin", "admin", "manager", "employee", "moderator"])

export function isStaffUser(user) {
  return Boolean(user?.role && ADMIN_ROLES.has(user.role))
}

/**
 * Base path for member-style account areas (messages list, notifications).
 * Staff always use `/admin/...` so they are not blocked by `userOnly` on `/dashboard`.
 */
export function useAccountSectionBasePath() {
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)
  if (pathname.startsWith("/admin")) return "/admin"
  if (isStaffUser(user)) return "/admin"
  return "/dashboard"
}
