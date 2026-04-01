import { useRef } from "react"
import { useFiltersStore } from "@/store/useFiltersStore"
import { cn } from "@/lib/utils"
import { DynamicIcon } from "@/components/ui/DynamicIcon"

/**
 * Section 1 — Main category icons bar. No scroll arrows.
 */
export function CategoryBar({ categories = [], isLoading }) {
  const { categoryId, setCategory } = useFiltersStore()
  const scrollRef = useRef(null)

  if (isLoading) {
    return (
      <div className="border-b border-border bg-background px-4 py-4 sm:px-6">
        <div className="flex gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <div className="size-[90px] animate-pulse rounded-xl bg-muted" />
              <div className="h-3 w-14 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (categories.length === 0) return null

  return (
    <div className="border-b border-border bg-background px-4 py-4 sm:px-6">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide py-1"
        style={{ scrollbarWidth: "thin" }}
      >
        {categories.map((cat) => {
          const isSelected = categoryId === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(isSelected ? null : cat.id)}
              className="flex flex-col items-center gap-2 shrink-0"
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-xl border border-border bg-card size-[90px] shrink-0",
                  isSelected && "border-b-[3px] border-b-foreground"
                )}
              >
                <DynamicIcon name={cat.icon} className="size-12 text-muted-foreground" />
              </div>
              <span
                className={cn(
                  "text-xs text-foreground/80 text-center max-w-[90px] truncate",
                  isSelected && "font-semibold"
                )}
              >
                {cat.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
