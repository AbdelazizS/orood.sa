import { useState } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { X, Car, Smartphone, Sofa, Monitor, Shirt, Factory, Laptop, Package } from "lucide-react"
import { MAIN_CATEGORIES } from "@/data/addListingData"

const ICONS = { Car, Smartphone, Sofa, Monitor, Shirt, Factory, Laptop, Package }

/**
 * Expandable inline two-column picker — Category.
 * Collapsed: single row with label + placeholder + chevron.
 * Expanded: two columns (main 40%, sub 60%).
 */
export function CategorySelector({ categoryId, subcategoryId, error, onChange }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const main = MAIN_CATEGORIES.find((c) => c.id === categoryId)
  const subs = main?.subcategories ?? []
  const sub = subs.find((s) => s.id === subcategoryId)

  const handleMainClick = (id) => {
    const cat = MAIN_CATEGORIES.find((c) => c.id === id)
    const hasSubs = cat?.subcategories?.length
    if (!hasSubs) {
      onChange(id, null)
      setExpanded(false)
    } else {
      onChange(id, null)
    }
  }

  const handleSubClick = (id) => {
    onChange(categoryId, id)
    setExpanded(false)
  }

  const handleClear = () => {
    onChange(null, null)
  }

  const displayText = main && (!subs.length || sub)
    ? `${main.name}${sub ? ` — ${sub.name}` : ""}`
    : null

  return (
    <div
      className="rounded-lg border border-border bg-card p-3 sm:p-4 mb-2"
      dir="rtl"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 text-start"
      >
        <span className="text-[14px] font-bold text-foreground">
          {t("addListing.categoryLabel")}
          <span className="text-destructive">*</span>
        </span>
        {displayText ? (
          <span className="flex-1 truncate text-end text-[14px] text-foreground">
            {displayText}
          </span>
        ) : (
          <span className="flex-1 truncate text-end text-[14px] text-muted-foreground">
            {t("addListing.categoryPlaceholder")}
          </span>
        )}
        <svg
          className={cn("size-4 shrink-0 transition-transform text-muted-foreground", expanded && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {displayText && !expanded && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleClear() }}
          className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
          {t("addListing.clear")}
        </button>
      )}

      {expanded && (
        <div className="mt-3 flex border-t border-border pt-3">
          <div className="w-[40%] border-s border-border">
            <div className="bg-muted px-2.5 py-2.5 text-[13px] font-bold text-foreground">
              {t("addListing.categoryPlaceholder")}
            </div>
            <div className="max-h-[240px] overflow-y-auto">
              {MAIN_CATEGORIES.map((c) => {
                const Icon = ICONS[c.icon] ?? Package
                const isSelected = categoryId === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleMainClick(c.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2.5 text-[14px] text-start transition-colors border-b border-border/50",
                      isSelected ? "border-e-[3px] border-e-primary bg-primary/10 text-primary" : "text-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex-1">
            <div className="bg-muted px-2.5 py-2.5 text-[13px] font-bold text-foreground">
              {t("addListing.categorySub")}
            </div>
            <div className="max-h-[240px] overflow-y-auto">
              {subs.length === 0 ? (
                <p className="px-3 py-4 text-[14px] text-muted-foreground">
                  {t("addListing.categorySelectMain")}
                </p>
              ) : (
                subs.map((s) => {
                  const isSelected = subcategoryId === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSubClick(s.id)}
                      className={cn(
                        "flex w-full items-center px-3 py-2.5 text-[14px] text-start transition-colors border-b border-border/50",
                        isSelected ? "bg-primary/10 text-primary" : "text-foreground"
                      )}
                    >
                      {s.name}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
