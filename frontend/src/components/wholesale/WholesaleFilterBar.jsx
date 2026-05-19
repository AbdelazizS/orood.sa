import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Building2, Filter, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/useDebounce"

const PRICE_SLIDER_MAX = 50_000
const SORT_OPTIONS = ["newest", "price_asc", "price_desc", "discount", "popular"]
const MIN_DISCOUNT_OPTIONS = ["", "5", "10", "15", "20", "30"]
const MIN_BUYERS_OPTIONS = ["", "2", "3", "5", "10", "20"]

function useIsNarrow(breakpointPx = 768) {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`)
    const upd = () => setNarrow(mq.matches)
    upd()
    mq.addEventListener("change", upd)
    return () => mq.removeEventListener("change", upd)
  }, [breakpointPx])
  return narrow
}

function patchSearchParams(prev, updates) {
  const next = new URLSearchParams(prev)
  Object.entries(updates).forEach(([k, v]) => {
    if (v === "" || v === null || v === undefined) next.delete(k)
    else next.set(k, String(v))
  })
  return next
}

export function WholesaleFilterBar({
  searchParams,
  setSearchParams,
  regions = [],
  categories = [],
  subcategories = [],
  totalResults = 0,
  pageDir = "rtl",
  isRTL = true,
}) {
  const { t } = useTranslation()
  const narrow = useIsNarrow()
  const [sheetOpen, setSheetOpen] = useState(false)

  const qFromUrl = searchParams.get("q") ?? ""
  const [localQ, setLocalQ] = useState(() => qFromUrl)
  useEffect(() => {
    setLocalQ(qFromUrl)
  }, [qFromUrl])

  const debouncedQ = useDebounce(localQ, 300)
  useEffect(() => {
    setSearchParams((prev) => patchSearchParams(prev, { q: debouncedQ }), { replace: true })
  }, [debouncedQ, setSearchParams])

  const priceMinUrl = searchParams.get("price_min") ?? ""
  const priceMaxUrl = searchParams.get("price_max") ?? ""
  const [priceRange, setPriceRange] = useState(() => {
    const mn = searchParams.get("price_min")
    const mx = searchParams.get("price_max")
    return [
      mn !== null && mn !== "" ? Number(mn) : 0,
      mx !== null && mx !== "" ? Number(mx) : PRICE_SLIDER_MAX,
    ]
  })

  useEffect(() => {
    const mn = searchParams.get("price_min")
    const mx = searchParams.get("price_max")
    setPriceRange([
      mn !== null && mn !== "" ? Number(mn) : 0,
      mx !== null && mx !== "" ? Number(mx) : PRICE_SLIDER_MAX,
    ])
  }, [priceMinUrl, priceMaxUrl, searchParams])

  const debouncedPriceRange = useDebounce(priceRange, 300)
  useEffect(() => {
    const [lo, hi] = debouncedPriceRange
    const updates = {}
    if (lo > 0) updates.price_min = String(Math.round(lo))
    else updates.price_min = ""
    if (hi < PRICE_SLIDER_MAX) updates.price_max = String(Math.round(hi))
    else updates.price_max = ""
    setSearchParams((prev) => patchSearchParams(prev, updates), { replace: true })
  }, [debouncedPriceRange, setSearchParams])

  const categoryId = searchParams.get("category_id") ?? ""
  const subcategoryId = searchParams.get("subcategory_id") ?? ""
  const regionId = searchParams.get("region_id") ?? ""
  const cityId = searchParams.get("city_id") ?? ""
  const sort = searchParams.get("sort") ?? "newest"
  const condition = searchParams.get("condition") ?? ""
  const minDiscount = searchParams.get("min_discount") ?? ""
  const minBuyers = searchParams.get("min_buyers") ?? ""
  const groupStatus = searchParams.get("group_status") ?? ""

  const selectedRegion = useMemo(
    () => regions.find((r) => String(r.id) === String(regionId)),
    [regions, regionId]
  )
  const cities = selectedRegion?.cities ?? []

  const update = useCallback(
    (updates) => {
      setSearchParams((prev) => patchSearchParams(prev, updates), { replace: true })
    },
    [setSearchParams]
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (debouncedQ.trim()) n += 1
    if (categoryId) n += 1
    if (subcategoryId) n += 1
    if (regionId) n += 1
    if (cityId) n += 1
    if (sort && sort !== "newest") n += 1
    if (condition) n += 1
    if (minDiscount) n += 1
    if (minBuyers) n += 1
    if (groupStatus) n += 1
    const [lo, hi] = debouncedPriceRange
    if (lo > 0 || hi < PRICE_SLIDER_MAX) n += 1
    return n
  }, [
    debouncedQ,
    categoryId,
    subcategoryId,
    regionId,
    cityId,
    sort,
    condition,
    minDiscount,
    minBuyers,
    groupStatus,
    debouncedPriceRange,
  ])

  const hasActiveFilters = activeFilterCount > 0

  const clearAll = () => {
    setLocalQ("")
    setPriceRange([0, PRICE_SLIDER_MAX])
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      const view = next.get("view")
      next.delete("q")
      next.delete("category_id")
      next.delete("subcategory_id")
      next.delete("region_id")
      next.delete("city_id")
      next.delete("price_min")
      next.delete("price_max")
      next.delete("condition")
      next.delete("min_discount")
      next.delete("min_buyers")
      next.delete("group_status")
      next.delete("sort")
      if (view) next.set("view", view)
      return next
    }, { replace: true })
  }

  const controls = (
    <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
      <div className="w-full min-w-[140px] md:w-[190px]">
        <Select
          value={categoryId || "all_categories"}
          onValueChange={(v) => {
            const id = v === "all_categories" ? "" : v
            update({ category_id: id, subcategory_id: "" })
          }}
        >
          <SelectTrigger className="h-12 w-full rounded-md border-border">
            <SelectValue placeholder={t("filters.allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_categories">{t("filters.allCategories")}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-[140px] md:w-[190px]">
        <Select
          value={subcategoryId || "all_subcategories"}
          onValueChange={(v) => update({ subcategory_id: v === "all_subcategories" ? "" : v })}
          disabled={!categoryId}
        >
          <SelectTrigger className="h-12 w-full rounded-md border-border">
            <SelectValue placeholder={t("filters.allSubcategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_subcategories">{t("filters.allSubcategories")}</SelectItem>
            {subcategories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-[140px] md:w-[190px]">
        <Select
          value={regionId || "all_regions"}
          onValueChange={(v) => update({ region_id: v === "all_regions" ? "" : v, city_id: "" })}
        >
          <SelectTrigger className="h-12 w-full rounded-md border-border">
            <SelectValue placeholder={t("filters.allRegions")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_regions">{t("filters.allRegions")}</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-[140px] md:w-[190px]">
        <Select
          value={cityId || "all_cities"}
          onValueChange={(v) => update({ city_id: v === "all_cities" ? "" : v })}
          disabled={!regionId}
        >
          <SelectTrigger className="h-12 w-full rounded-md border-border">
            <SelectValue placeholder={t("filters.allCities")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_cities">{t("filters.allCities")}</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-full min-w-0 flex-1 rounded-md border border-input md:min-w-[240px] md:max-w-md">
        <Input
          type="search"
          placeholder={t("wholesale.filters.searchPlaceholder")}
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          className="h-12 flex-1 min-w-0 rounded-none border-0 px-3 text-sm focus-visible:ring-0"
          dir={pageDir}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-12 w-12 shrink-0 rounded-none"
          aria-label={t("wholesale.filters.searchAria")}
          onClick={() => update({ q: localQ })}
        >
          <Search className="size-[18px]" />
        </Button>
      </div>

      <div className="w-full min-w-[160px] md:w-[200px]">
        <Select value={sort} onValueChange={(v) => update({ sort: v === "newest" ? "" : v })}>
          <SelectTrigger className="h-12 w-full rounded-md border-border">
            <SelectValue placeholder={t("wholesale.market.sortLabel")} />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {t(`wholesale.market.sort.${opt}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-[140px] md:w-[180px]">
        <Select
          value={condition || "all_condition"}
          onValueChange={(v) => update({ condition: v === "all_condition" ? "" : v })}
        >
          <SelectTrigger className="h-12 w-full rounded-md border-border">
            <SelectValue placeholder={t("wholesale.filters.condition")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_condition">{t("wholesale.filters.conditionAny")}</SelectItem>
            <SelectItem value="new">{t("wholesale.filters.conditionNew")}</SelectItem>
            <SelectItem value="used">{t("wholesale.filters.conditionUsed")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-[140px] md:w-[180px]">
        <Select
          value={minDiscount || "all_min_discount"}
          onValueChange={(v) => update({ min_discount: v === "all_min_discount" ? "" : v })}
        >
          <SelectTrigger className="h-12 w-full rounded-md border-border">
            <SelectValue placeholder={t("wholesale.filters.minDiscount")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_min_discount">{t("wholesale.filters.minDiscountAny")}</SelectItem>
            {MIN_DISCOUNT_OPTIONS.filter(Boolean).map((v) => (
              <SelectItem key={v} value={v}>
                {t("wholesale.filters.minDiscountValue", { percent: v })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-[140px] md:w-[180px]">
        <Select
          value={minBuyers || "all_min_buyers"}
          onValueChange={(v) => update({ min_buyers: v === "all_min_buyers" ? "" : v })}
        >
          <SelectTrigger className="h-12 w-full rounded-md border-border">
            <SelectValue placeholder={t("wholesale.filters.minBuyers")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_min_buyers">{t("wholesale.filters.minBuyersAny")}</SelectItem>
            {MIN_BUYERS_OPTIONS.filter(Boolean).map((v) => (
              <SelectItem key={v} value={v}>
                {t("wholesale.filters.minBuyersValue", { n: v })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-[140px] md:w-[200px]">
        <Select
          value={groupStatus || "all_group_status"}
          onValueChange={(v) => update({ group_status: v === "all_group_status" ? "" : v })}
        >
          <SelectTrigger className="h-12 w-full rounded-md border-border">
            <SelectValue placeholder={t("wholesale.filters.groupStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_group_status">{t("wholesale.filters.groupStatusAny")}</SelectItem>
            {["open", "almost_full"].map((v) => (
              <SelectItem key={v} value={v}>
                {t(`wholesale.filters.groupStatus.${v}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-[220px] flex-1 md:max-w-sm">
        <p className="mb-2 text-xs text-muted-foreground">{t("wholesale.filters.priceRange")}</p>
        <div dir={pageDir} className="px-1 pt-2">
          <Slider
            min={0}
            max={PRICE_SLIDER_MAX}
            step={100}
            value={priceRange}
            onValueChange={(v) => setPriceRange(v)}
            className="w-full"
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("wholesale.filters.priceRangeValue", {
            min: priceRange[0],
            max: priceRange[1] >= PRICE_SLIDER_MAX ? t("wholesale.filters.priceMaxOpen") : priceRange[1],
          })}
        </p>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
        {hasActiveFilters ? (
          <Button type="button" variant="outline" size="sm" className="h-10 gap-1" onClick={clearAll}>
            <X className="size-4" />
            {t("wholesale.filters.clearAll")}
          </Button>
        ) : null}
        <Button variant="outline" asChild className="h-10 gap-2">
          <Link to="/wholesale/companies">
            <Building2 className="size-4" />
            {t("wholesale.market.companiesList")}
          </Link>
        </Button>
      </div>
    </div>
  )

  const resultsLine = (
    <p className={cn("text-sm text-muted-foreground", isRTL ? "text-end" : "text-start")}>
      {t("wholesale.filters.resultsCount", { count: totalResults })}
    </p>
  )

  if (narrow) {
    return (
      <div className="space-y-3 border-b border-border bg-background px-4 py-3 sm:px-0" dir={pageDir}>
        <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" className="gap-2">
                <Filter className="size-4" />
                {t("wholesale.filters.openSheet")}
                {activeFilterCount > 0 ? (
                  <Badge variant="secondary" className="tabular-nums">
                    {activeFilterCount}
                  </Badge>
                ) : null}
              </Button>
            </SheetTrigger>
            <SheetContent side={isRTL ? "right" : "left"} className="flex w-full max-w-md flex-col gap-4 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{t("wholesale.filters.sheetTitle")}</SheetTitle>
              </SheetHeader>
              {controls}
              <SheetClose asChild>
                <Button type="button" className="w-full">
                  {t("wholesale.filters.applyClose")}
                </Button>
              </SheetClose>
            </SheetContent>
          </Sheet>
          {resultsLine}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 border-b border-border bg-background px-4 py-3 sm:px-0" dir={pageDir}>
      {controls}
      {resultsLine}
    </div>
  )
}
