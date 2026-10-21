import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { useAppDirection } from "@/providers/DirectionProvider"
import { useFiltersStore } from "@/store/useFiltersStore"
import { ListingsPriceMap } from "@/components/maps/ListingsPriceMap.jsx"
import { ListingsMapSearchPanel } from "@/components/maps/ListingsMapSearchPanel.jsx"
import { countActiveMapFilters } from "@/lib/listings/mapFilters"
import { isAwaitingMarker } from "@/components/maps/PriceMarker"
import { formatShortPrice } from "@/lib/formatShortPrice"
import { MAP_TYPE_CHIPS } from "@/lib/listings/mapChips"
import { useAuthStore } from "@/store/useAuthStore"
import { getAvailableMap } from "@/services/subscriberService"
import { realEstateTypeLabel } from "@/lib/realEstate/labels"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Building2, List, Loader2, Map as MapIcon, MapPin, Megaphone, Plus, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

/** Desktop (mouse) users go straight to the listing; touch users see the preview card first. */
function prefersDirectNavigation() {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)").matches
}

/** Height of the sticky site header, so the map fills the rest of the viewport. */
function useSiteHeaderHeight() {
  const [height, setHeight] = useState(0)
  useEffect(() => {
    const header = document.querySelector("header")
    if (!header || typeof ResizeObserver === "undefined") return undefined
    const ro = new ResizeObserver(([entry]) => {
      setHeight(Math.round(entry.target.getBoundingClientRect().height))
    })
    ro.observe(header)
    return () => ro.disconnect()
  }, [])
  return height
}

function ListingPreviewCard({ marker, onClose }) {
  const { t, i18n } = useTranslation()
  const awaiting = isAwaitingMarker(marker)
  const price = formatShortPrice(marker.price, i18n.language)
  const place = [marker.city, marker.district].filter(Boolean).join(" · ")
  const href = marker.url ?? `/products/${marker.id}`

  return (
    <div className="pointer-events-auto relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <Link to={href} className="flex gap-3 p-2.5 pe-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {marker.thumbnail ? (
            <img src={marker.thumbnail} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <MapPin className="size-6" aria-hidden />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div className="min-w-0">
            {awaiting ? (
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {t("listingsMap.awaitingPin", "انتظار")}
              </span>
            ) : (
              <span className="text-base font-bold tabular-nums text-primary">
                {price ? `${price} ${t("common.currency", "ريال")}` : t("listingsMap.noPrice", "على السوم")}
              </span>
            )}
            <p className="mt-0.5 truncate text-sm font-medium text-foreground">{marker.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[marker.property_type ? realEstateTypeLabel(marker.property_type, t) : null, place]
                .filter(Boolean)
                .join(" — ")}
            </p>
          </div>
          <span className="mt-1 text-xs font-semibold text-primary">{t("listingsMap.viewDetails", "عرض التفاصيل")}</span>
        </div>
      </Link>
      <button
        type="button"
        onClick={onClose}
        className="absolute end-2 top-2 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={t("common.close", "إغلاق")}
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}

function MapListRow({ marker }) {
  const { t, i18n } = useTranslation()
  const awaiting = isAwaitingMarker(marker)
  const price = formatShortPrice(marker.price, i18n.language)
  const place = [marker.city, marker.district].filter(Boolean).join(" · ")
  return (
    <Link
      to={marker.url ?? `/products/${marker.id}`}
      className="flex gap-3 border-b border-border p-3 transition-colors last:border-b-0 hover:bg-muted/50"
    >
      <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-24">
        {marker.thumbnail ? <img src={marker.thumbnail} alt="" loading="lazy" className="size-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold sm:text-base">{marker.title}</p>
        <p className={cn("mt-0.5 text-sm font-bold tabular-nums", awaiting ? "text-muted-foreground" : "text-primary")}>
          {marker.pin_label ?? (awaiting ? t("listingsMap.awaitingPin", "انتظار") : price ? `${price} ${t("common.currency", "ريال")}` : t("listingsMap.noPrice", "على السوم"))}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[marker.property_type ? realEstateTypeLabel(marker.property_type, t) : null, place].filter(Boolean).join(" — ")}
        </p>
      </div>
    </Link>
  )
}

export function ListingsMapPage() {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const realEstateOnly = searchParams.get("real_estate_only") === "1"
  const user = useAuthStore((s) => s.user)
  const isSubscriber = user?.role === "subscriber"
  // Tabs from the PDF screenshot: العروض (map) · المشاريع (later) · القائمة (list) · طلب تسويق (subscribers).
  const requestedView = searchParams.get("view")
  const view = requestedView === "list" ? "list" : requestedView === "marketing" && isSubscriber ? "marketing" : "map"
  const setView = (next) => {
    const params = new URLSearchParams(searchParams)
    if (next === "map") params.delete("view")
    else params.set("view", next)
    setSearchParams(params, { replace: true })
  }
  const headerHeight = useSiteHeaderHeight()

  const filters = useFiltersStore()
  const { cityId, district, rePurpose, rePropertyType, categoryId, minPrice, maxPrice, streetWidthMin } = filters
  const activeChip = MAP_TYPE_CHIPS.find((c) => c.purpose === rePurpose && c.type === rePropertyType)?.id ?? (rePurpose || rePropertyType ? null : "all")
  const pickChip = (chip) =>
    filters.setMapFilters(chip ? { rePurpose: chip.purpose, rePropertyType: chip.type } : { rePurpose: null, rePropertyType: null })
  const activeFilterCount = countActiveMapFilters(filters)

  const [panelOpen, setPanelOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  // Filters (not bounds) decide when the map refits; bounds only narrow the current filter set.
  const filterKey = JSON.stringify([cityId, district, rePurpose, rePropertyType, categoryId, minPrice, maxPrice, streetWidthMin, realEstateOnly])
  const [boundsState, setBoundsState] = useState({ key: null, bounds: null })
  const bounds = boundsState.key === filterKey ? boundsState.bounds : null

  const handleBoundsChange = useCallback((b) => {
    setBoundsState({ key: filterKey, bounds: b })
  }, [filterKey])

  const { data = [], isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["listings", "map", filterKey, bounds],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/listings/map", {
        params: {
          city_id: cityId || undefined,
          district: district || undefined,
          purpose: rePurpose || undefined,
          property_type: rePropertyType || undefined,
          category_id: categoryId || undefined,
          min_price: minPrice !== "" && minPrice != null ? minPrice : undefined,
          max_price: maxPrice !== "" && maxPrice != null ? maxPrice : undefined,
          street_width_min: streetWidthMin ?? undefined,
          real_estate_only: realEstateOnly ? 1 : undefined,
          ...(bounds ?? {}),
          per_page: 300,
        },
      })
      return Array.isArray(res?.data) ? res.data : []
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled: view !== "marketing",
  })

  // "طلب تسويق": listings awaiting a marketer, for subscribers (click → full details + "شراء الإعلان").
  const marketingQuery = useQuery({
    queryKey: ["subscriber", "available-map", cityId, rePropertyType],
    queryFn: () => getAvailableMap({ city_id: cityId, property_type: rePropertyType }),
    enabled: view === "marketing",
    placeholderData: keepPreviousData,
  })

  const marketingData = marketingQuery.data
  const markers = useMemo(
    () =>
      (view === "marketing" ? marketingData ?? [] : data)
        .filter((m) => Number.isFinite(Number(m.lat)) && Number.isFinite(Number(m.lng)))
        .map((m) => ({
          ...m,
          lat: Number(m.lat),
          lng: Number(m.lng),
          ...(view === "marketing" ? { pin_label: t("subscriber.mapPin", "طلب تسويق") } : {}),
        })),
    [marketingData, data, view, t],
  )

  const selectedMarker = selected ? markers.find((m) => m.id === selected.id) ?? selected : null

  const handleSelect = useCallback(
    (marker) => {
      if (prefersDirectNavigation()) {
        navigate(marker.url ?? `/products/${marker.id}`)
        return
      }
      setSelected(marker)
    },
    [navigate],
  )

  const handleMapClick = useCallback(() => setSelected(null), [])

  const busy = view === "marketing" ? marketingQuery.isFetching : isFetching
  const showEmpty = !isLoading && !busy && !isError && markers.length === 0

  const tabs = [
    { id: "map", icon: MapIcon, label: t("listingsMap.tabOffers", "العروض") },
    { id: "projects", icon: Building2, label: t("listingsMap.tabProjects", "المشاريع"), soon: true },
    { id: "list", icon: List, label: t("listingsMap.tabList", "القائمة") },
    ...(isSubscriber ? [{ id: "marketing", icon: Megaphone, label: t("subscriber.mapPin", "طلب تسويق") }] : []),
  ]

  return (
    <div
      dir={direction}
      className="flex flex-col bg-background"
      style={{ height: headerHeight ? `calc(100dvh - ${headerHeight}px)` : "calc(100dvh - 4rem)" }}
    >
      <div className="shrink-0 border-b border-border">
        <div className="flex items-center gap-2 px-2 py-1.5 sm:px-4">
          <Button variant="ghost" size="icon" className="size-10 shrink-0" asChild>
            <Link to="/" aria-label={t("common.back", "رجوع")}>
              <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
            </Link>
          </Button>
          <h1 className="hidden min-w-0 truncate text-base font-bold md:block lg:text-lg">{t("realEstate.mapBrowse", "خريطة العقارات")}</h1>
          <div className="mx-auto flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = view === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={tab.soon}
                  onClick={() => setView(tab.id)}
                  className={cn(
                    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    tab.soon && "cursor-not-allowed opacity-60 hover:bg-transparent",
                  )}
                  title={tab.soon ? t("listingsMap.soon", "قريباً") : undefined}
                >
                  <Icon className="size-4" aria-hidden />
                  {tab.label}
                  {tab.soon ? <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium">{t("listingsMap.soon", "قريباً")}</span> : null}
                </button>
              )
            })}
          </div>
          <span className="hidden shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs tabular-nums text-muted-foreground sm:inline">
            {t("realEstate.mapCount", { count: markers.length, defaultValue: "{{count}} إعلان على الخريطة" })}
          </span>
          {!isSubscriber ? (
            <Button size="sm" variant="outline" className="shrink-0 gap-1 rounded-full" asChild>
              <Link to="/add">
                <Plus className="size-4" aria-hidden />
                <span className="hidden sm:inline">{t("listingsMap.add", "إضافة")}</span>
              </Link>
            </Button>
          ) : null}
        </div>
        <div className="flex gap-1.5 overflow-x-auto px-2 pb-2 [scrollbar-width:none] sm:px-4" aria-label={t("realEstate.typeLabel", "نوع العقار")}>
          {[{ id: "all" }, ...MAP_TYPE_CHIPS].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => pickChip(chip.id === "all" ? null : chip)}
              aria-pressed={activeChip === chip.id}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                activeChip === chip.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/50",
              )}
            >
              {t(`listingsMap.chips.${chip.id}`, chip.id)}
            </button>
          ))}
        </div>
      </div>

      {view === "list" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between gap-2 p-3">
              <p className="text-sm text-muted-foreground">
                {t("realEstate.mapCount", { count: markers.length, defaultValue: "{{count}} إعلان على الخريطة" })}
              </p>
              <Button size="sm" className="gap-1.5 rounded-full" onClick={() => setPanelOpen(true)}>
                <Search className="size-4" aria-hidden />
                {t("listingsMap.search", "بحث")}
                {activeFilterCount > 0 ? <span className="rounded-full bg-primary-foreground px-1.5 text-xs font-bold text-primary">{activeFilterCount}</span> : null}
              </Button>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : markers.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t("listingsMap.empty", "لا توجد عقارات في هذه المنطقة")}</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {markers.map((m) => <MapListRow key={m.id} marker={m} />)}
              </div>
            )}
          </div>
        </div>
      ) : (
      <div className="relative min-h-0 flex-1">
        <ListingsPriceMap
          markers={markers}
          selectedId={selectedMarker?.id ?? null}
          fitKey={`${filterKey}-${view}`}
          onSelect={view === "marketing" ? (m) => navigate(`/subscriber/listings/${m.id}`) : handleSelect}
          onBoundsChange={view === "marketing" ? undefined : handleBoundsChange}
          onMapClick={handleMapClick}
        />

        {/* Floating search button + status chips */}
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-col items-center gap-2 px-3">
          <Button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="pointer-events-auto h-10 gap-2 rounded-full px-5 shadow-lg"
          >
            <Search className="size-4" aria-hidden />
            {t("listingsMap.search", "بحث")}
            {activeFilterCount > 0 ? (
              <span className="flex min-w-5 items-center justify-center rounded-full bg-primary-foreground px-1.5 text-xs font-bold text-primary tabular-nums">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>

          {busy ? (
            <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {t("listingsMap.loading", "جاري تحميل العقارات…")}
            </span>
          ) : isError ? (
            <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-background/95 px-3 py-1 text-xs text-destructive shadow">
              {t("listingsMap.error", "تعذر تحميل العقارات")}
              <button type="button" className="font-semibold underline" onClick={() => refetch()}>
                {t("listingsMap.retry", "إعادة المحاولة")}
              </button>
            </span>
          ) : showEmpty ? (
            <span className="pointer-events-auto rounded-full bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow">
              {t("listingsMap.empty", "لا توجد عقارات في هذه المنطقة")}
            </span>
          ) : null}
        </div>

        {/* Bottom: preview card (touch) or legend */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {selectedMarker ? (
            <ListingPreviewCard marker={selectedMarker} onClose={() => setSelected(null)} />
          ) : (
            <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full bg-background/95 px-3 py-1.5 text-xs shadow">
              <span className="inline-flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-full bg-[oklch(0.5_0.13_148.5)]")} aria-hidden />
                {t("listingsMap.legendAvailable", "متاح")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[oklch(0.55_0.01_260)]" aria-hidden />
                {t("listingsMap.legendAwaiting", "بانتظار مسوق")}
              </span>
            </div>
          )}
        </div>
      </div>

      )}

      <ListingsMapSearchPanel open={panelOpen} onOpenChange={setPanelOpen} />
    </div>
  )
}
