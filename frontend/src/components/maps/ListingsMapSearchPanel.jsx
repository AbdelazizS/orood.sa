import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useRegions, useCities } from "@/hooks/useRegions"
import { useFiltersStore } from "@/store/useFiltersStore"
import { realEstateTypeLabel } from "@/lib/realEstate/labels"
import { DistrictCombobox } from "@/components/filters/DistrictCombobox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { MAP_PROPERTY_TYPES, STREET_WIDTH_OPTIONS } from "@/lib/listings/mapFilters"

const ALL = "all"

function digitsOnly(value) {
  // Accept Arabic-Indic digits too, keep plain ASCII digits.
  return String(value ?? "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\D/g, "")
}

function withThousands(raw) {
  if (!raw) return ""
  return Number(raw).toLocaleString("en-US")
}

function PriceInput({ id, label, value, onChange }) {
  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        inputMode="numeric"
        dir="ltr"
        className="h-10 text-start tabular-nums"
        placeholder="0"
        value={withThousands(value)}
        onChange={(e) => onChange(digitsOnly(e.target.value))}
      />
    </div>
  )
}

function initialDraft(store) {
  return {
    rePropertyType: store.rePropertyType ?? null,
    regionId: store.regionId ?? null,
    cityId: store.cityId ?? null,
    district: store.district ?? null,
    minPrice: store.minPrice ?? "",
    maxPrice: store.maxPrice ?? "",
    streetWidthMin: store.streetWidthMin ?? null,
  }
}

/**
 * Side panel opened by the floating "بحث" button on the listings map.
 * Edits a local draft; "تطبيق" writes it to useFiltersStore in one update.
 */
export function ListingsMapSearchPanel({ open, onOpenChange }) {
  const { t } = useTranslation()
  const store = useFiltersStore()
  const [draft, setDraft] = useState(() => initialDraft(store))

  const handleOpenChange = (next) => {
    if (next) setDraft(initialDraft(useFiltersStore.getState()))
    onOpenChange(next)
  }

  const { data: regions = [] } = useRegions()
  const selectedRegion = regions.find((r) => r.id === draft.regionId)
  const embeddedCities = selectedRegion?.cities ?? []
  const { data: fetchedCities = [] } = useCities(embeddedCities.length ? null : draft.regionId)
  const cities = embeddedCities.length ? embeddedCities : fetchedCities

  const update = (patch) => setDraft((d) => ({ ...d, ...patch }))

  const priceRangeInvalid = useMemo(
    () => draft.minPrice !== "" && draft.maxPrice !== "" && Number(draft.minPrice) > Number(draft.maxPrice),
    [draft.minPrice, draft.maxPrice],
  )

  const apply = () => {
    if (priceRangeInvalid) return
    store.setMapFilters(draft)
    onOpenChange(false)
  }

  const clear = () => {
    store.resetMapFilters()
    setDraft(initialDraft(useFiltersStore.getState()))
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {/* "start" = right edge in RTL, left edge in LTR. Full width on phones. */}
      <SheetContent side="start" className="w-full max-w-none gap-0 sm:w-[400px] sm:max-w-[400px]">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{t("listingsMap.searchTitle", "البحث في الخريطة")}</SheetTitle>
          <SheetDescription>{t("listingsMap.searchHint", "حدد المواصفات ثم اضغط تطبيق")}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("realEstate.typeLabel", "نوع العقار")}</Label>
            <Select
              value={draft.rePropertyType ?? ALL}
              onValueChange={(v) => update({ rePropertyType: v === ALL ? null : v })}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("filters.all", "الكل")}</SelectItem>
                {MAP_PROPERTY_TYPES.map((pt) => (
                  <SelectItem key={pt} value={pt}>
                    {realEstateTypeLabel(pt, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("listingsMap.region", "المنطقة")}</Label>
              <Select
                value={draft.regionId != null ? String(draft.regionId) : ALL}
                onValueChange={(v) =>
                  update({ regionId: v === ALL ? null : Number(v), cityId: null, district: null })
                }
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("filters.all", "الكل")}</SelectItem>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("listingsMap.city", "المدينة")}</Label>
              <Select
                value={draft.cityId != null ? String(draft.cityId) : ALL}
                onValueChange={(v) => update({ cityId: v === ALL ? null : Number(v), district: null })}
                disabled={!draft.regionId}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("filters.all", "الكل")}</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("listingsMap.district", "الحي")}</Label>
            <DistrictCombobox
              cityId={draft.cityId}
              value={draft.district}
              onChange={(d) => update({ district: d })}
              allowAll
            />
          </div>

          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-sm font-medium">
              {t("listingsMap.priceRange", "السعر")} <span className="text-xs text-muted-foreground">({t("common.currency", "ريال")})</span>
            </legend>
            <div className="flex gap-3">
              <PriceInput
                id="map-min-price"
                label={t("listingsMap.priceFrom", "من")}
                value={draft.minPrice}
                onChange={(v) => update({ minPrice: v })}
              />
              <PriceInput
                id="map-max-price"
                label={t("listingsMap.priceTo", "إلى")}
                value={draft.maxPrice}
                onChange={(v) => update({ maxPrice: v })}
              />
            </div>
            {priceRangeInvalid ? (
              <p className="text-xs text-destructive">{t("listingsMap.priceRangeInvalid", "السعر «من» يجب أن يكون أقل من «إلى»")}</p>
            ) : draft.minPrice !== "" || draft.maxPrice !== "" ? (
              <p className="text-xs text-muted-foreground">{t("listingsMap.priceHidesAwaiting", "عند تحديد السعر لا تظهر العقارات بانتظار مسوق")}</p>
            ) : null}
          </fieldset>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("listingsMap.streetWidthMin", "عرض الشارع (أقل شيء)")}</Label>
            <Select
              value={draft.streetWidthMin != null ? String(draft.streetWidthMin) : ALL}
              onValueChange={(v) => update({ streetWidthMin: v === ALL ? null : Number(v) })}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("filters.all", "الكل")}</SelectItem>
                {STREET_WIDTH_OPTIONS.map((w, i) => (
                  <SelectItem key={w} value={String(w)}>
                    {i === STREET_WIDTH_OPTIONS.length - 1
                      ? t("listingsMap.streetWidthPlus", { value: w, defaultValue: "{{value}}+ م" })
                      : t("listingsMap.streetWidthValue", { value: w, defaultValue: "{{value}} م" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 border-t border-border">
          <Button type="button" className="h-11 flex-1" onClick={apply} disabled={priceRangeInvalid}>
            {t("listingsMap.apply", "تطبيق")}
          </Button>
          <Button type="button" variant="outline" className="h-11 flex-1" onClick={clear}>
            {t("listingsMap.clear", "مسح")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
