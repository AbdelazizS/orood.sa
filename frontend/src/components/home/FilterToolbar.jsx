import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useFiltersStore } from "@/store/useFiltersStore"
import { cn } from "@/lib/utils"
import { FEATURED_FILTERS } from "@/config/navigation"
import { PackageSearch, Search } from "lucide-react"
import { ResetFiltersButton } from "@/components/filters/ResetFiltersButton"

/**
 * Filter toolbar — Search on button click.
 * @param {{ regions?: unknown[], hideWholesaleLink?: boolean, hideFeaturedFilter?: boolean, showReset?: boolean, clearSearchOnEmpty?: boolean, inputDir?: "rtl" | "ltr", searchPlaceholder?: string }} [props]
 */
export function FilterToolbar({
  regions = [],
  hideWholesaleLink = false,
  hideFeaturedFilter = false,
  showReset = false,
  clearSearchOnEmpty = false,
  inputDir,
  searchPlaceholder,
} = {}) {
  const { t } = useTranslation()
  const resolvedPlaceholder =
    searchPlaceholder ?? t("filters.searchPlaceholder", "ابحث في العروض والطلبات والشركات...")
  const {
    activeFilter,
    setActiveFilter,
    regionId,
    cityId,
    setRegion,
    setCity,
    searchQuery,
    setSearchQuery,
  } = useFiltersStore()

  const [localSearch, setLocalSearch] = useState(searchQuery ?? "")

  /* eslint-disable react-hooks/set-state-in-effect -- keep local input in sync when store search is cleared elsewhere */
  useEffect(() => {
    setLocalSearch(searchQuery ?? "")
  }, [searchQuery])
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedRegion = regions.find((r) => r.id === regionId)
  const cities = selectedRegion?.cities ?? []

  const handleSearchClick = () => {
    setSearchQuery(localSearch.trim())
  }

  const commitSearchIfEmpty = () => {
    if (clearSearchOnEmpty && !localSearch.trim()) {
      setSearchQuery("")
    }
  }

  const gridCols = cn(
    "md:grid-cols-2",
    hideFeaturedFilter
      ? hideWholesaleLink
        ? showReset
          ? "xl:grid-cols-[190px_190px_minmax(280px,1fr)_auto_auto]"
          : "xl:grid-cols-[190px_190px_minmax(320px,1fr)_auto]"
        : showReset
          ? "xl:grid-cols-[190px_190px_minmax(280px,1fr)_auto_auto_auto]"
          : "xl:grid-cols-[190px_190px_minmax(320px,1fr)_auto_auto]"
      : hideWholesaleLink
        ? showReset
          ? "xl:grid-cols-[190px_190px_190px_minmax(260px,1fr)_auto_auto]"
          : "xl:grid-cols-[190px_190px_190px_minmax(320px,1fr)_auto]"
        : showReset
          ? "xl:grid-cols-[190px_190px_190px_minmax(260px,1fr)_auto_auto_auto]"
          : "xl:grid-cols-[190px_190px_190px_minmax(320px,1fr)_auto_auto]"
  )

  return (
    <div className="border-b border-border bg-background px-4 py-3 sm:px-6">
      <div className={cn("grid grid-cols-1 gap-2", gridCols)}>
        <div>
          <Select
            value={regionId ? String(regionId) : "all"}
            onValueChange={(v) => setRegion(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="h-12 w-full rounded-md border-border">
              <SelectValue
                className="truncate text-sm"
                placeholder={t("filters.allRegions", "جميع المناطق")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allRegions", "جميع المناطق")}</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select
            value={cityId ? String(cityId) : "all"}
            onValueChange={(v) => setCity(v === "all" ? null : Number(v))}
            disabled={!regionId}
          >
            <SelectTrigger className="h-12 w-full rounded-md border-border">
              <SelectValue
                className="truncate text-sm"
                placeholder={t("filters.allCities", "جميع المدن")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allCities", "جميع المدن")}</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hideFeaturedFilter ? null : (
          <div>
            <Select value={activeFilter ?? "all"} onValueChange={setActiveFilter}>
              <SelectTrigger className="h-12 w-full rounded-md border-border">
                <SelectValue
                  className="truncate text-sm"
                  placeholder={t("filters.allFilters", "المميزات")}
                />
              </SelectTrigger>
              <SelectContent>
                {FEATURED_FILTERS.filter((f) => f.id !== "wholesale").map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {t(f.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex min-w-0 w-full rounded-md border border-input overflow-hidden">
          <Input
            type="search"
            placeholder={resolvedPlaceholder}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onBlur={commitSearchIfEmpty}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                if (localSearch.trim()) {
                  handleSearchClick()
                } else {
                  commitSearchIfEmpty()
                }
              }
            }}
            dir={inputDir}
            className="h-12 flex-1 min-w-0 rounded-none border-0 px-3 text-sm focus-visible:ring-0"
          />
          <Button
            type="button"
            onClick={handleSearchClick}
            size="icon"
            className="h-12 w-12 shrink-0 rounded-none bg-primary text-primary-foreground hover:bg-primary/90"
            aria-label={t("feed.search", "بحث")}
          >
            <Search className="size-[18px]" />
          </Button>
        </div>

        {showReset ? (
          <div className="flex items-center">
            <ResetFiltersButton />
          </div>
        ) : null}

        {hideWholesaleLink ? null : (
          <Button
            variant="outline"
            asChild
            className="h-12 w-full rounded-md px-4 text-sm md:w-auto"
          >
            <Link to="/wholesale" className="flex h-full items-center gap-2">
              <PackageSearch className="size-4" />
              {t("nav.wholesaleMarket", "سوق الجملة")}
            </Link>
          </Button>
        )}
        <Button
          asChild
          className="h-12 w-full rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 md:w-auto"
        >
          <Link to="/add" className="flex h-full items-center">{t("nav.addOfferAndRequest", "اضف عرض و طلب")}</Link>
        </Button>
      </div>
    </div>
  )
}