import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"
import { useTranslation } from "react-i18next"

export function useMainCategories() {
  const { i18n } = useTranslation();
  return useQuery({
    queryKey: ["categories", i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get("/categories")
      return data?.data ?? []
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useSubcategories(mainId) {
  const { i18n } = useTranslation();
  return useQuery({
    queryKey: ["categories", mainId, "subcategories", i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get(`/categories/${mainId}/subcategories`)
      return data?.data ?? []
    },
    enabled: !!mainId,
    staleTime: 1000 * 60 * 10,
  })
}
