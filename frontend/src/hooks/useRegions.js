import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"

export function useRegions() {
  return useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data } = await apiClient.get("/regions")
      return data?.data ?? []
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useCities(regionId) {
  return useQuery({
    queryKey: ["regions", regionId, "cities"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/regions/${regionId}/cities`)
      return data?.data ?? []
    },
    enabled: !!regionId,
    staleTime: 1000 * 60 * 10,
  })
}
