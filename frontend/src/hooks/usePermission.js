import { useAuthStore } from "@/store/useAuthStore"

/**
 * Check if the current user has a specific permission.
 * Super admin has all permissions (*).
 * @param {string} permission - Permission name (e.g. 'offers.update', 'categories.view')
 * @returns {boolean}
 */
export function usePermission(permission) {
  const user = useAuthStore((s) => s.user)
  if (!user?.permissions) return false
  if (user.permissions.includes("*")) return true
  return user.permissions.includes(permission)
}

/**
 * Check if user has any of the given permissions.
 */
export function useHasAnyPermission(permissions) {
  const user = useAuthStore((s) => s.user)
  if (!user?.permissions) return false
  if (user.permissions.includes("*")) return true
  return permissions.some((p) => user.permissions.includes(p))
}
