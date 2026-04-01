import { MapPin } from "lucide-react"
import { useFiltersStore } from "@/store/useFiltersStore"
import { useTranslation } from "react-i18next"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function RegionCitySelectors({ regions = [] }) {
  const { t } = useTranslation()
  const { regionId, cityId, setRegion, setCity } = useFiltersStore()

  const selectedRegion = regions.find((region) => region.id === regionId)

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <MapPin className="size-4 text-primary" />
        <span>{t("filters.location")}</span>
      </div>
      <Select
        value={regionId !== null && regionId !== undefined ? regionId.toString() : "all"}
        onValueChange={(value) => setRegion(value === "all" ? null : Number(value))}
      >
        <SelectTrigger className="w-[200px] rounded-full">
          <SelectValue placeholder={t("common.all")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("common.all")}</SelectItem>
          {regions.map((region) => (
            <SelectItem key={region.id} value={region.id.toString()}>
              {region.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={cityId !== null && cityId !== undefined ? cityId.toString() : "all"}
        onValueChange={(value) => setCity(value === "all" ? null : Number(value))}
        disabled={!selectedRegion}
      >
        <SelectTrigger className="w-[200px] rounded-full">
          <SelectValue placeholder={t("common.all")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("common.all")}</SelectItem>
          {selectedRegion?.cities?.map((city) => (
            <SelectItem key={city.id} value={city.id.toString()}>
              {city.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
