import { useTranslation } from "react-i18next"
import { useCities, useRegions } from "@/hooks/useRegions"
import { realEstateTypeLabel } from "@/lib/realEstate/labels"
import { MAP_PROPERTY_TYPES } from "@/lib/listings/mapFilters"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ALL = "all"

/**
 * City → property type filter used in the subscriber lists (the client's "يحدد المدينة + نوع العقار").
 * @param {{ value: { regionId: number|null, cityId: number|null, propertyType: string|null }, onChange: (next: object) => void }} props
 */
export function SubscriberFilters({ value, onChange }) {
  const { t } = useTranslation()
  const { data: regions = [] } = useRegions()
  const region = regions.find((r) => r.id === value.regionId)
  const embedded = region?.cities ?? []
  const { data: fetched = [] } = useCities(embedded.length ? null : value.regionId)
  const cities = embedded.length ? embedded : fetched

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <Select
        value={value.regionId != null ? String(value.regionId) : ALL}
        onValueChange={(v) => onChange({ ...value, regionId: v === ALL ? null : Number(v), cityId: null })}
      >
        <SelectTrigger className="h-10 w-full" aria-label={t("listingsMap.region", "المنطقة")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("subscriber.filters.allRegions", "كل المناطق")}</SelectItem>
          {regions.map((r) => (
            <SelectItem key={r.id} value={String(r.id)}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.cityId != null ? String(value.cityId) : ALL}
        onValueChange={(v) => onChange({ ...value, cityId: v === ALL ? null : Number(v) })}
        disabled={!value.regionId}
      >
        <SelectTrigger className="h-10 w-full" aria-label={t("listingsMap.city", "المدينة")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("subscriber.filters.allCities", "كل المدن")}</SelectItem>
          {cities.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.propertyType ?? ALL}
        onValueChange={(v) => onChange({ ...value, propertyType: v === ALL ? null : v })}
      >
        <SelectTrigger className="h-10 w-full" aria-label={t("realEstate.typeLabel", "نوع العقار")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("subscriber.filters.allTypes", "كل أنواع العقار")}</SelectItem>
          {MAP_PROPERTY_TYPES.map((pt) => (
            <SelectItem key={pt} value={pt}>
              {realEstateTypeLabel(pt, t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
