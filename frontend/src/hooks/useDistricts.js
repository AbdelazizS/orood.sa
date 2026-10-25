import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"

/** Districts (الأحياء) of a city: the curated list plus districts already used by listings. */
export function useDistricts(cityId) {
  return useQuery({
    queryKey: ["districts", cityId],
    queryFn: async () => {
      const { data } = await apiClient.get("/districts", { params: { city_id: cityId } })
      return Array.isArray(data?.data) ? data.data : []
    },
    enabled: Boolean(cityId),
    staleTime: 10 * 60_000,
  })
}
