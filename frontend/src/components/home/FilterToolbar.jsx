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
import { FEATURED_FILTERS } from "@/config/navigation"
import { Search, RotateCcw } from "lucide-react"

/**
 * Filter toolbar — Search only on button click. Primary search btn at end.
 */
export function FilterToolbar({ regions = [], features = {} }) {
  const { t } = useTranslation()
  const {
    categoryId,
    subcategoryId,
    activeFilter,
    setActiveFilter,
    regionId,
    cityId,
    setRegion,
    setCity,
    searchQuery,
    setSearchQuery,
    resetFilters,
  } = useFiltersStore()

  const [localSearch, setLocalSearch] = useState(searchQuery ?? "")

  useEffect(() => {
    setLocalSearch(searchQuery ?? "")
  }, [searchQuery])

  const selectedRegion = regions.find((r) => r.id === regionId)
  const cities = selectedRegion?.cities ?? []

  const showWholesale = features?.show_wholesale !== false
  const showCompanyDirectory = features?.show_company_directory !== false

  const hasActiveFilters =
    categoryId ||
    subcategoryId ||
    regionId ||
    cityId ||
    (activeFilter && activeFilter !== "all") ||
    searchQuery

  const handleSearchClick = () => {
    setSearchQuery(localSearch || "")
  }

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 border-b border-border bg-background px-4 py-3 sm:px-6">
      {/* Filters section — Region, City, Features, Search — always first */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 order-1 flex-1 min-w-0">
        {/* Region */}
        <Select
          value={regionId ? String(regionId) : "all"}
          onValueChange={(v) => setRegion(v === "all" ? null : Number(v))}
        >
          <SelectTrigger className="w-[110px] sm:w-[130px] shrink-0 rounded-md h-10 border-border">
            <SelectValue placeholder={t("filters.allRegions", "جميع المناطق")} />
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

        {/* City */}
        <Select
          value={cityId ? String(cityId) : "all"}
          onValueChange={(v) => setCity(v === "all" ? null : Number(v))}
          disabled={!regionId}
        >
          <SelectTrigger className="w-[110px] sm:w-[130px] shrink-0 rounded-md h-10 border-border">
            <SelectValue placeholder={t("filters.allCities", "جميع المدن")} />
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

        {/* Features */}
        <Select value={activeFilter ?? "all"} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-[120px] sm:w-[130px] shrink-0 rounded-md h-10 border-border">
            <SelectValue placeholder={t("filters.allFilters", "المميزات")} />
          </SelectTrigger>
          <SelectContent>
            {FEATURED_FILTERS.filter((f) => f.id !== "wholesale").map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {t(f.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search — only on button click. Primary btn at end. */}
        <div className="flex min-w-[160px] sm:min-w-[220px] flex-1 rounded-md border border-input overflow-hidden">
          <Input
            type="search"
            placeholder={t("feed.searchPlaceholder", "ابحث")}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="h-10 flex-1 min-w-0 rounded-none border-0 focus-visible:ring-0"
          />
          <Button
            type="button"
            onClick={handleSearchClick}
            className="shrink-0 h-10 rounded-none bg-primary hover:bg-primary/90 text-primary-foreground px-4"
            aria-label={t("feed.search", "بحث")}
          >
            <Search className="size-4 me-1" />
            {t("feed.search", "بحث")}
          </Button>
        </div>
      </div>

      {/* Action buttons — Reset, Add, Wholesale, Companies */}
      <div className="flex flex-wrap items-center gap-2 order-2 shrink-0">
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="shrink-0 rounded-md h-10"
          >
            <RotateCcw className="size-4 me-1" />
            {t("filters.resetFilters", "إعادة تعيين")}
          </Button>
        )}
        <Button
          asChild
          className="shrink-0 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 py-2 h-10"
        >
          <Link to="/add">{t("nav.addOfferAndRequest", "اضف عرض و طلب")}</Link>
        </Button>

        {showWholesale && (
          <Button
            variant={activeFilter === "wholesale" ? "secondary" : "default"}
            className="shrink-0 rounded-md font-bold px-4 py-2 h-10"
            onClick={() => setActiveFilter(activeFilter === "wholesale" ? "all" : "wholesale")}
          >
            {t("filters.wholesale", "سعر الجملة")}
          </Button>
        )}

        {showCompanyDirectory && (
          <Button
            asChild
            className="shrink-0 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 py-2 h-10"
          >
            <Link to="/#companies">{t("feed.companyDirectory", "قائمة الشركات")}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
