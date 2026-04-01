import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import apiClient from "@/lib/apiClient"
import { useFiltersStore } from "@/store/useFiltersStore"

/**
 * Shows selected subcategory or "All Subcategories". No placeholder.
 */
export function SubcategoryDropdown() {
  const { t } = useTranslation()
  const { categoryId, subcategoryId, setSubcategory } = useFiltersStore()

  const { data: subcategories = [], isFetching } = useQuery({
    queryKey: ["subcategories", categoryId],
    queryFn: async () => {
      if (!categoryId) return []
      const { data } = await apiClient.get(`/categories/${categoryId}/subcategories`)
      return data?.data ?? data ?? []
    },
    enabled: Boolean(categoryId),
  })

  const selectedLabel = useMemo(() => {
    if (!subcategoryId) return t("filters.allSubcategories")
    const sub = subcategories.find((s) => s.id === subcategoryId)
    return sub?.name ?? t("filters.allSubcategories")
  }, [subcategoryId, subcategories, t])

  if (!categoryId) {
    return null
  }

  return (
    <Select
      value={subcategoryId ? String(subcategoryId) : "all"}
      onValueChange={(value) => setSubcategory(value === "all" ? null : Number(value))}
      disabled={isFetching}
    >
      <SelectTrigger className="w-full rounded-2xl">
        <SelectValue>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t("filters.allSubcategories")}</SelectItem>
        {subcategories.map((sub) => (
          <SelectItem key={sub.id} value={String(sub.id)}>
            {sub.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
