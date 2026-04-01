import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"

export function useVisitorStats(enabled = true) {
  return useQuery({
    queryKey: ["visitor-stats"],
    queryFn: () =>
      apiClient.get("/account/visitor-stats").then((r) => r.data?.data ?? r.data),
    staleTime: 60_000,
    enabled,
  })
}
