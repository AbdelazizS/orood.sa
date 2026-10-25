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
import { Clapperboard, Map as MapIcon, PackageSearch, Search } from "lucide-react"
import { ResetFiltersButton } from "@/components/filters/ResetFiltersButton"
import { DistrictCombobox } from "@/components/filters/DistrictCombobox"
import { useSiteFeatures } from "@/hooks/useSiteFeatures"

const CONTROL = "h-10 w-full min-w-0 rounded-md border-border text-sm"

/**
 * Search bar under the categories: region → city → district (searchable), search box,
 * and the «الخريطة» / «فيديوهات» entry points (client note 2026-10: compact, district list,
 * map + videos here instead of the header).
 *
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
  const { showWholesaleButton } = useSiteFeatures()
  const resolvedPlaceholder =
    searchPlaceholder ?? t("filters.searchPlaceholder", "ابحث في العروض والطلبات والشركات...")
  const {
    activeFilter,
    setActiveFilter,
    regionId,
    cityId,
    district,
    setRegion,
    setCity,
    setDistrict,
    searchQuery,
    setSearchQuery,
  } = useFiltersStore()

  // Wholesale pages reuse this bar without the marketplace extras (district, map, videos).
  const marketplace = !hideWholesaleLink
  const showWholesale = marketplace && showWholesaleButton

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

  const regionSelect = (
    <Select value={regionId ? String(regionId) : "all"} onValueChange={(v) => setRegion(v === "all" ? null : Number(v))}>
      <SelectTrigger className={CONTROL} aria-label={t("filters.region", "المنطقة")}>
        <SelectValue className="truncate" placeholder={t("filters.allRegions", "جميع المناطق")} />
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
  )

  const citySelect = (
    <Select value={cityId ? String(cityId) : "all"} onValueChange={(v) => setCity(v === "all" ? null : Number(v))} disabled={!regionId}>
      <SelectTrigger className={CONTROL} aria-label={t("filters.city", "المدينة")}>
        <SelectValue className="truncate" placeholder={t("filters.allCities", "جميع المدن")} />
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
  )

  const featuredSelect = hideFeaturedFilter ? null : (
    <Select value={activeFilter ?? "all"} onValueChange={setActiveFilter}>
      <SelectTrigger className={CONTROL} aria-label={t("filters.allFilters", "المميزات")}>
        <SelectValue className="truncate" placeholder={t("filters.allFilters", "المميزات")} />
      </SelectTrigger>
      <SelectContent>
        {FEATURED_FILTERS.filter((f) => f.id !== "wholesale").map((f) => (
          <SelectItem key={f.id} value={f.id}>
            {t(f.label)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const searchBox = (
    <div className="flex h-10 min-w-0 flex-1 overflow-hidden rounded-md border border-input lg:min-w-[220px]">
      <Input
        type="search"
        placeholder={resolvedPlaceholder}
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
        onBlur={commitSearchIfEmpty}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            if (localSearch.trim()) handleSearchClick()
            else commitSearchIfEmpty()
          }
        }}
        dir={inputDir}
        className="h-10 min-w-0 flex-1 rounded-none border-0 px-3 text-sm focus-visible:ring-0"
      />
      <Button
        type="button"
        onClick={handleSearchClick}
        size="icon"
        className="h-10 w-10 shrink-0 rounded-none bg-primary text-primary-foreground hover:bg-primary/90"
        aria-label={t("feed.search", "بحث")}
      >
        <Search className="size-4" />
      </Button>
    </div>
  )

  // compact: icon + label on phones and wide screens, icon only on narrower desktops.
  const mediaLinks = (compact) =>
    marketplace ? (
      <>
        <Button variant="outline" asChild className="h-10 gap-1.5 rounded-md px-3 text-sm font-semibold">
          <Link to="/listings/map" title={t("nav.map", "الخريطة")}>
            <MapIcon className="size-4" aria-hidden />
            <span className={compact ? "hidden xl:inline" : undefined}>{t("nav.map", "الخريطة")}</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-10 gap-1.5 rounded-md px-3 text-sm font-semibold">
          <Link to="/videos" title={t("nav.videos", "فيديوهات")}>
            <Clapperboard className="size-4" aria-hidden />
            <span className={compact ? "hidden xl:inline" : undefined}>{t("nav.videos", "فيديوهات")}</span>
          </Link>
        </Button>
      </>
    ) : null

  const wholesaleLink = showWholesale ? (
    <Button variant="outline" asChild className="h-10 rounded-md px-3 text-sm">
      <Link to="/wholesale" className="flex items-center gap-2">
        <PackageSearch className="size-4" />
        {t("nav.wholesaleMarket", "سوق الجملة")}
      </Link>
    </Button>
  ) : null

  const addLink = (
    <Button asChild className="h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90">
      <Link to="/add" className="flex items-center">{t("nav.addOfferAndRequest", "اضف عرض و طلب")}</Link>
    </Button>
  )

  return (
    <div className="border-b border-border bg-background px-3 py-2.5 sm:px-6">
      {/* Phones: compact rows. Region · City · District, then search, then map / videos. */}
      <div className="space-y-2 lg:hidden">
        <div className={cn("grid gap-2 [&_button]:px-2 [&_button]:text-xs", marketplace ? "grid-cols-3" : "grid-cols-2")}>
          {regionSelect}
          {citySelect}
          {marketplace ? (
            <DistrictCombobox cityId={cityId} value={district} onChange={setDistrict} allowAll triggerClassName="h-10" />
          ) : null}
        </div>
        <div className="flex gap-2">
          {featuredSelect ? <div className="w-[34%] shrink-0">{featuredSelect}</div> : null}
          {searchBox}
          {showReset ? <ResetFiltersButton /> : null}
        </div>
        {marketplace ? (
          <div className={cn("grid gap-2", showWholesale ? "grid-cols-3" : "grid-cols-2")}>
            {mediaLinks(false)}
            {wholesaleLink}
          </div>
        ) : null}
      </div>

      {/* Desktop: one row. */}
      <div className="hidden items-center gap-2 lg:flex">
        <div className="w-36 shrink-0 xl:w-40">{regionSelect}</div>
        <div className="w-36 shrink-0 xl:w-40">{citySelect}</div>
        {marketplace ? (
          <div className="w-36 shrink-0 xl:w-44">
            <DistrictCombobox cityId={cityId} value={district} onChange={setDistrict} allowAll />
          </div>
        ) : null}
        {featuredSelect ? <div className="hidden w-32 shrink-0 2xl:block">{featuredSelect}</div> : null}
        {searchBox}
        {showReset ? <ResetFiltersButton /> : null}
        {mediaLinks(true)}
        {wholesaleLink}
        {addLink}
      </div>
    </div>
  )
}
