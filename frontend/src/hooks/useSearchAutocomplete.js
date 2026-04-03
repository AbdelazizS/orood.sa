import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"

export function useSearchAutocomplete(query) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return []
      const { data } = await apiClient.get("/search", { params: { q: query } })
      return data?.data ?? []
    },
    enabled: Boolean(query && query.length >= 2),
    staleTime: 1000 * 30,
  })
}
