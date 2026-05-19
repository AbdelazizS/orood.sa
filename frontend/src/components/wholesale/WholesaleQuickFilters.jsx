import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

function patch(prev, updates) {
  const next = new URLSearchParams(prev)
  Object.entries(updates).forEach(([k, v]) => {
    if (v === "" || v === null || v === undefined) next.delete(k)
    else next.set(k, String(v))
  })
  return next
}

/**
 * @param {{ searchParams: URLSearchParams, setSearchParams: Function, pageDir: string, getCopy?: (field: string, fallbackKey: string) => string }} props
 */
export function WholesaleQuickFilters({ searchParams, setSearchParams, pageDir, getCopy }) {
  const { t } = useTranslation()
  const c = getCopy ?? ((field, key) => t(key))
  const current = searchParams.get("group_status") ?? ""

  const setGroup = (value) => {
    setSearchParams((prev) => patch(prev, { group_status: value }), { replace: true })
  }

  const chips = [
    { value: "", label: c("quick_filters_all", "wholesale.market.quickFilters.all") },
    { value: "open", label: c("quick_filters_open", "wholesale.market.quickFilters.open") },
    { value: "almost_full", label: c("quick_filters_almost_full", "wholesale.market.quickFilters.almostFull") },
  ]

  return (
    <div dir={pageDir} className="border-b border-border/60 bg-muted/15 px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
        <span className="w-full text-xs font-medium text-muted-foreground sm:w-auto sm:pe-3">
          {c("quick_filters_label", "wholesale.market.quickFilters.label")}
        </span>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const active = current === chip.value || (chip.value === "" && !current)
            return (
              <button
                key={chip.value || "all"}
                type="button"
                onClick={() => setGroup(chip.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:bg-muted/80"
                )}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
