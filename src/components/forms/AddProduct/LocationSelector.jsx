import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import apiClient from "@/lib/apiClient"
import { MapPin } from "lucide-react"

export function LocationSelector({ regionId, cityId, onChange, disabled }) {
  const { t } = useTranslation()

  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data } = await apiClient.get("/regions")
      return data?.data ?? []
    },
  })

  const selectedRegion = regions.find((r) => String(r.id) === String(regionId))
  const cities = selectedRegion?.cities ?? []

  const displayValue = selectedRegion
    ? cityId
      ? `${selectedRegion.name} — ${cities.find((c) => String(c.id) === String(cityId))?.name ?? ""}`
      : selectedRegion.name
    : ""

  return (
    <div className="space-y-4">
      <Label>{t("addProduct.selectLocation", "Location")}</Label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="region" className="text-muted-foreground">
            {t("addOffer.regionLabel")}
          </Label>
          <Select
            value={regionId ? String(regionId) : ""}
            onValueChange={(v) => {
              onChange(v ? Number(v) : null, null)
            }}
            disabled={disabled}
          >
            <SelectTrigger id="region" className="w-full">
              <MapPin className="size-4 shrink-0 opacity-50" />
              <SelectValue placeholder={t("addOffer.selectRegion")} />
            </SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="city" className="text-muted-foreground">
            {t("addOffer.cityLabel")}
          </Label>
          <Select
            value={cityId ? String(cityId) : ""}
            onValueChange={(v) => onChange(regionId, v ? Number(v) : null)}
            disabled={disabled || !regionId}
          >
            <SelectTrigger id="city" className="w-full">
              <SelectValue placeholder={t("addOffer.selectCity")} />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {displayValue && (
        <p className="text-sm text-muted-foreground">
          {t("addProduct.selectedLocation", "Selected")}: {displayValue}
        </p>
      )}
    </div>
  )
}
