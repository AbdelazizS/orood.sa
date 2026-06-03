import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { useFiltersStore } from "@/store/useFiltersStore"
import { cn } from "@/lib/utils"
import { DynamicIcon } from "@/components/ui/DynamicIcon"
import { LayoutGrid } from "lucide-react"
/**
 * Main category icons bar — filters homepage feed only (no /category/* navigation).
 */
export function CategoryBar({ categories = [], isLoading }) {
  const { t } = useTranslation()
  const { categoryId, setCategory } = useFiltersStore()
  const scrollRef = useRef(null)

  if (isLoading) {
    return (
      <div className="border-b border-border bg-background px-4 py-4 sm:px-6" data-nosnippet>
        <div className="flex gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <div className="size-14 animate-pulse sm:size-[72px] md:size-[90px] rounded-xl bg-muted" />
              <div className="h-3 w-12 animate-pulse sm:w-14 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (categories.length === 0) return null

  return (
    <div className="border-b border-border bg-background px-4 py-4 sm:px-6" data-nosnippet>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide py-1 sm:gap-4"
        style={{ scrollbarWidth: "thin" }}
      >
        <button
          type="button"
          onClick={() => setCategory(null)}
          className="flex flex-col items-center gap-2 shrink-0"
        >
          <div
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-card sm:size-[72px] md:size-[90px]",
              categoryId == null && "border-b-[3px] border-b-primary",
            )}
          >
            <LayoutGrid className="size-6 text-muted-foreground sm:size-8 md:size-10" />
          </div>
          <span
            className={cn(
              "max-w-[3.5rem] truncate text-center text-[10px] text-foreground/80 sm:max-w-[72px] sm:text-xs md:max-w-[90px]",
              categoryId == null && "font-semibold text-foreground",
            )}
          >
            {t("common.all", "الكل")}
          </span>
        </button>
        {categories.map((cat) => {
          const isSelected = String(categoryId) === String(cat.id)
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(isSelected ? null : cat.id)}
              className="flex flex-col items-center gap-2 shrink-0"
            >
              <div
                className={cn(
                  "flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-card sm:size-[72px] md:size-[90px]",
                  isSelected && "border-b-[3px] border-b-primary",
                )}
              >
                <DynamicIcon name={cat.icon} className="size-6 text-muted-foreground sm:size-10 md:size-12" />
              </div>
              <span
                className={cn(
                  "max-w-[3.5rem] truncate text-center text-[10px] text-foreground/80 sm:max-w-[72px] sm:text-xs md:max-w-[90px]",
                  isSelected && "font-semibold text-foreground",
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
