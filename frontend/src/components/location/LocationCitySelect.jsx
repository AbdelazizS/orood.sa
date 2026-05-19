import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function prepareCitiesForRegion(cities, regionName) {
  const byId = new Map()
  for (const city of cities ?? []) {
    if (city?.id != null && !byId.has(city.id)) {
      byId.set(city.id, city)
    }
  }
  const list = Array.from(byId.values())
  const nameCounts = new Map()
  for (const city of list) {
    const name = String(city.name ?? "").trim()
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)
  }

  return list.map((city) => {
    const name = String(city.name ?? "").trim()
    const duplicateName = (nameCounts.get(name) ?? 0) > 1
    return {
      ...city,
      label: duplicateName && regionName ? `${name} — ${regionName}` : name || `#${city.id}`,
    }
  })
}

/**
 * Region + city picker with deduplicated city options and disambiguated labels.
 */
export function LocationCitySelect({
  regions = [],
  value,
  onChange,
  initialRegionId,
  placeholder,
  showClearOption = false,
  showLabels = false,
  className = "mt-1 flex flex-col gap-2 sm:flex-row",
}) {
  const { t } = useTranslation()
  const [regionId, setRegionId] = useState(initialRegionId ?? null)

  useEffect(() => {
    if (initialRegionId) setRegionId(initialRegionId)
  }, [initialRegionId])

  useEffect(() => {
    if (value && regions.length) {
      const match = regions.find((r) => r.cities?.some((c) => c.id === value))
      if (match && match.id !== regionId) {
        setRegionId(match.id)
      }
    }
  }, [value, regions, regionId])

  const selectedRegion = useMemo(
    () => regions.find((r) => r.id === regionId) ?? null,
    [regions, regionId]
  )

  const cityOptions = useMemo(
    () => prepareCitiesForRegion(selectedRegion?.cities, selectedRegion?.name),
    [selectedRegion]
  )

  const regionValue = regionId ? String(regionId) : showClearOption ? "all" : ""
  const cityValue = value ? String(value) : showClearOption ? "all" : ""

  return (
    <div className={className}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {showLabels ? (
          <span className="text-sm font-medium leading-none">{t("profile.selectRegion", "اختر المنطقة")}</span>
        ) : null}
        <Select
          value={regionValue}
          onValueChange={(v) => {
            const id = v && v !== "all" ? Number(v) : null
            setRegionId(id)
            onChange(null)
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t("profile.selectRegion", "اختر المنطقة")} />
          </SelectTrigger>
          <SelectContent>
            {showClearOption ? (
              <SelectItem value="all">{t("common.all")}</SelectItem>
            ) : null}
            {regions.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {showLabels ? (
          <span className="text-sm font-medium leading-none">
            {placeholder || t("profile.selectCity", "اختر المدينة")}
          </span>
        ) : null}
        <Select
          value={cityValue}
          onValueChange={(v) => onChange(v && v !== "all" ? Number(v) : null)}
          disabled={!regionId}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {showClearOption ? (
              <SelectItem value="all">{t("common.all")}</SelectItem>
            ) : null}
            {cityOptions.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
