import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFiltersStore } from "@/store/useFiltersStore"

/**
 * CategoryDropdown shows selected category name or "All Categories".
 * No placeholder – always displays current filter state.
 */
export function CategoryDropdown({ categories = [], isLoading }) {
  const { t } = useTranslation()
  const { categoryId, setCategory, setSubcategory } = useFiltersStore()

  const selectedLabel = useMemo(() => {
    if (!categoryId) return t("filters.allCategories")
    const cat = categories.find((c) => c.id === categoryId)
    return cat?.name ?? t("filters.allCategories")
  }, [categoryId, categories, t])

  return (
    <Select
      value={categoryId ? String(categoryId) : "all"}
      onValueChange={(value) => {
        if (value === "all") {
          setCategory(null)
          setSubcategory(null)
        } else {
          setCategory(Number(value))
          setSubcategory(null)
        }
      }}
      disabled={isLoading}
    >
      <SelectTrigger className="min-w-0 w-full sm:min-w-[180px] sm:w-auto rounded-2xl">
        <SelectValue>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
        {categories.map((category) => (
          <SelectItem key={category.id} value={String(category.id)}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
