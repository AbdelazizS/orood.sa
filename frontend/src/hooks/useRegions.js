import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

export function useRegions() {
  const { i18n } = useTranslation()

  return useQuery({
    queryKey: ["regions", i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get("/regions")
      return unwrapList(data)
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useCities(regionId) {
  const { i18n } = useTranslation()

  return useQuery({
    queryKey: ["regions", regionId, "cities", i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get(`/regions/${regionId}/cities`)
      return unwrapList(data)
    },
    enabled: !!regionId,
    staleTime: 1000 * 60 * 10,
  })
}
