import { useState } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { X, Loader2 } from "lucide-react"
import { useRegions, useCities } from "@/hooks/useRegions"
import { useAppDirection } from "@/providers/DirectionProvider"

export function LocationSelector({ regionId, cityId, error, onChange }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const [expanded, setExpanded] = useState(false)
  const { data: regions = [], isLoading: loadingRegions } = useRegions()
  const { data: cities = [], isLoading: loadingCities } = useCities(regionId)

  const region = regions.find((r) => String(r.id) === String(regionId))
  const city = cities.find((c) => String(c.id) === String(cityId))

  const handleRegionClick = (id) => onChange(id, null)
  const handleCityClick = (id) => {
    onChange(regionId, id)
    setExpanded(false)
  }
  const handleClear = () => onChange(null, null)

  const displayText = region && city ? `${region.name} — ${city.name}` : null

  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-4 mb-2" dir={direction}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 text-start"
      >
        <span className="text-[14px] font-bold text-foreground">
          {t("addListing.locationLabel")}
          <span className="text-destructive">*</span>
        </span>
        {displayText ? (
          <span className="flex-1 truncate text-start text-[14px] text-foreground">{displayText}</span>
        ) : (
          <span className="flex-1 truncate text-start text-[14px] text-muted-foreground">
            {t("addListing.locationPlaceholder")}
          </span>
        )}
        <svg className={cn("size-4 shrink-0 transition-transform text-muted-foreground", expanded && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {displayText && !expanded && (
        <button type="button" onClick={(e) => { e.stopPropagation(); handleClear() }} className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground">
          <X className="size-3" />
          {t("addListing.clear")}
        </button>
      )}

      {expanded && (
        <div className="mt-3 flex border-t border-border pt-3">
          <div className="w-[40%] border-s border-border">
            <div className="bg-muted px-2.5 py-2.5 text-[13px] font-bold text-foreground">{t("addListing.locationPlaceholder")}</div>
            <div className="max-h-[240px] overflow-y-auto">
              {loadingRegions ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              ) : (
                regions.map((r) => {
                const isSelected = String(regionId) === String(r.id)
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRegionClick(r.id)}
                    className={cn(
                      "flex w-full items-center px-3 py-2.5 text-[14px] text-start transition-colors border-b border-border/50",
                      isSelected ? "border-e-[3px] border-e-primary bg-primary/10 text-primary" : "text-foreground"
                    )}
                  >
                    {r.name}
                  </button>
                )
              }))}
            </div>
          </div>
          <div className="flex-1">
            <div className="bg-muted px-2.5 py-2.5 text-[13px] font-bold text-foreground">{t("addListing.cities")}</div>
            <div className="max-h-[240px] overflow-y-auto">
              {loadingCities && regionId ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              ) : cities.length === 0 ? (
                <p className="px-3 py-4 text-[14px] text-muted-foreground">{t("addListing.locationSelectRegion")}</p>
              ) : (
                cities.map((c) => {
                  const isSelected = String(cityId) === String(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCityClick(c.id)}
                      className={cn(
                        "flex w-full items-center px-3 py-2.5 text-[14px] text-start transition-colors border-b border-border/50",
                        isSelected ? "bg-primary/10 text-primary" : "text-foreground"
                      )}
                    >
                      {c.name}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-sm text-destructive" role="alert">{error}</p>}
    </div>
  )
}
