import { useRef } from "react"
import { useFiltersStore } from "@/store/useFiltersStore"
import { cn } from "@/lib/utils"

/**
 * Subcategory chips row — shown when a main category is selected (homepage feed filter).
 */
export function SubcategoryBar({ categories = [] }) {
  const { categoryId, subcategoryId, setSubcategory } = useFiltersStore()
  const scrollRef = useRef(null)

  const selectedCategory = categories.find((c) => String(c.id) === String(categoryId))
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
          const isSelected = String(subcategoryId) === String(sub.id)
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSubcategory(isSelected ? null : sub.id)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors sm:px-4 sm:text-sm",
                isSelected
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border bg-muted/50 text-foreground hover:bg-muted",
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
