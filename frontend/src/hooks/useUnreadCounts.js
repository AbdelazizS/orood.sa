import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { isStaffUser } from "@/lib/accountSectionPaths"

/**
 * Unread messages + notifications for the red badges (header and mobile bottom bar).
 * Shares the ["conversations"] cache with MessageIcon and the inbox.
 */
export function useUnreadCounts() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const signedIn = Boolean(token && user)
  const staff = isStaffUser(user)

  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await apiClient.get("/conversations")
      return data?.data ?? []
    },
    enabled: signedIn && !staff,
    retry: false,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })

  const notifications = useQuery({
    queryKey: ["notifications", "summary"],
    queryFn: async () => {
      const { data } = await apiClient.get("/notifications?per_page=1")
      return { unreadCount: Number(data?.meta?.unread_count ?? 0) }
    },
    enabled: signedIn,
    retry: false,
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })

  return {
    messages: signedIn && !staff ? (conversations.data ?? []).reduce((n, c) => n + (c.unread_count ?? 0), 0) : 0,
    notifications: signedIn ? notifications.data?.unreadCount ?? 0 : 0,
  }
}
