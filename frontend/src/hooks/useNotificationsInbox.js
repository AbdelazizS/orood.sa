import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"

const INBOX_QUERY_KEY = ["notifications", "inbox"]

/**
 * Shared inbox query: list + server `meta.unread_count` (do not infer unread from first page only).
 */
export function useNotificationsInboxQueryOptions(perPage = 50, extra = {}) {
  return {
    queryKey: [...INBOX_QUERY_KEY, perPage],
    queryFn: async () => {
      const { data } = await apiClient.get(`/notifications?per_page=${perPage}`)
      return {
        items: Array.isArray(data?.data) ? data.data : [],
        meta: data?.meta ?? {},
      }
    },
    staleTime: 15_000,
    ...extra,
  }
}

export function useNotificationsInbox(perPage = 50, extra = {}) {
  return useQuery(useNotificationsInboxQueryOptions(perPage, extra))
}

/** Lightweight badge: only needs `meta.unread_count` (not unread inferred from first row). */
export function useNotificationsUnreadSummary() {
  return useQuery({
    queryKey: ["notifications", "summary"],
    queryFn: async () => {
      const { data } = await apiClient.get("/notifications?per_page=1")
      return { unreadCount: Number(data?.meta?.unread_count ?? 0) }
    },
    staleTime: 15_000,
    retry: false,
  })
}
