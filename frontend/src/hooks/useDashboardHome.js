import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"

export function useDashboardHome() {
  return useQuery({
    queryKey: ["dashboard", "home"],
    queryFn: async () => {
      const { data } = await apiClient.get("/dashboard/home")
      return data?.data ?? data
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  })
}
