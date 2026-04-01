import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"

export function useReports(period = "week", enabled = true) {
  return useQuery({
    queryKey: ["reports", period],
    queryFn: () =>
      apiClient
        .get("/account/reports", { params: { period } })
        .then((r) => r.data?.data ?? r.data),
    staleTime: 60_000,
    enabled,
  })
}
