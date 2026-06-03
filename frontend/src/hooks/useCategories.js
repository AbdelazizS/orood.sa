import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"
import { useTranslation } from "react-i18next"

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

export function useMainCategories() {
  const { i18n } = useTranslation()
  return useQuery({
    queryKey: ["categories", i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get("/categories")
      return unwrapList(data)
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useSubcategories(mainId, parentId = null) {
  const { i18n } = useTranslation()
  const parentKey = parentId ?? "roots"
  return useQuery({
    queryKey: ["categories", mainId, "subcategories", parentKey, i18n.language],
    queryFn: async () => {
      const params = parentId ? { parent_id: parentId } : {}
      const { data } = await apiClient.get(`/categories/${mainId}/subcategories`, { params })
      return unwrapList(data)
    },
    enabled: !!mainId,
    staleTime: 1000 * 60 * 10,
  })
}
