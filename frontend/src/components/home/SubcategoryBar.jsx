import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { useFiltersStore } from "@/store/useFiltersStore"
import { cn } from "@/lib/utils"

/**
 * Section 2 — Subcategory chips row. No scroll arrows.
 */
export function SubcategoryBar({ categories = [] }) {
  const { t } = useTranslation()
  const { categoryId, subcategoryId, setSubcategory } = useFiltersStore()
  const scrollRef = useRef(null)

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const subcategories = selectedCategory?.subcategories ?? []

  if (!categoryId || subcategories.length === 0) return null

  return (
    <div className="border-b border-border bg-background px-4 py-3 sm:px-6">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-1"
        style={{ scrollbarWidth: "thin" }}
      >
        {subcategories.map((sub) => {
          const isSelected = subcategoryId === sub.id
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSubcategory(isSelected ? null : sub.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm whitespace-nowrap shrink-0 transition-colors",
                isSelected
                  ? "bg-primary/10 border border-primary text-primary font-medium"
                  : "bg-muted/50 border border-border text-foreground hover:bg-muted"
              )}
            >
              {sub.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
