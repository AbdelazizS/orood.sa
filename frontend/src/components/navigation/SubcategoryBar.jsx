import { useMemo } from "react"
import { useFiltersStore } from "@/store/useFiltersStore"

export function SubcategoryBar({ categories = [] }) {
  const { categoryId, subcategoryId, setSubcategory } = useFiltersStore()

  const subcategories = useMemo(() => {
    if (!categoryId) return []
    return categories.find((category) => category.id === categoryId)?.subcategories ?? []
  }, [categories, categoryId])

  if (!categoryId || subcategories.length === 0) return null

  return (
    <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {subcategories.map((sub) => (
          <button
            key={sub.id}
            type="button"
            className={`rounded-full border px-3 py-1 ${
              subcategoryId === sub.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30"
            }`}
            onClick={() => setSubcategory(sub.id)}
          >
            {sub.name}
          </button>
        ))}
      </div>
    </div>
  )
}
