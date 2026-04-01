import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"

export function useMainCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await apiClient.get("/categories")
      return data?.data ?? []
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useSubcategories(mainId) {
  return useQuery({
    queryKey: ["categories", mainId, "subcategories"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/categories/${mainId}/subcategories`)
      return data?.data ?? []
    },
    enabled: !!mainId,
    staleTime: 1000 * 60 * 10,
  })
}
