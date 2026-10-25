import { useTranslation } from "react-i18next"
import { useFiltersStore } from "@/store/useFiltersStore"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { realEstateTypeLabel } from "@/lib/realEstate/labels"

const PROPERTY_TYPES = ["apartment", "villa", "land", "building", "floor", "shop", "farm"]

export function RealEstateFilterBar() {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const {
    rePurpose,
    rePropertyType,
    reMinArea,
    reMaxArea,
    reBedroomsMin,
    setRePurpose,
    setRePropertyType,
    setReMinArea,
    setReMaxArea,
    setReBedroomsMin,
  } = useFiltersStore()

  return (
    <div
      dir={direction}
      className="border-b border-border bg-muted/20 px-3 py-2 sm:px-6"
    >
      {/* Map access moved to «الخريطة» in the search bar above. */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-end gap-2 sm:gap-3">
        <div className="space-y-1">
          <Label className="text-xs">{t("realEstate.purposeLabel", "الغرض")}</Label>
          <Select
            value={rePurpose ?? "all"}
            onValueChange={(v) => setRePurpose(v === "all" ? null : v)}
          >
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all", "الكل")}</SelectItem>
              <SelectItem value="sale">{t("realEstate.purposeSale", "للبيع")}</SelectItem>
              <SelectItem value="rent">{t("realEstate.purposeRent", "للإيجار")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{t("realEstate.typeLabel", "النوع")}</Label>
          <Select
            value={rePropertyType ?? "all"}
            onValueChange={(v) => setRePropertyType(v === "all" ? null : v)}
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all", "الكل")}</SelectItem>
              {PROPERTY_TYPES.map((pt) => (
                <SelectItem key={pt} value={pt}>
                  {realEstateTypeLabel(pt, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{t("realEstate.minArea", "مساحة من")}</Label>
          <Input
            type="number"
            className="h-9 w-24"
            value={reMinArea ?? ""}
            onChange={(e) => setReMinArea(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{t("realEstate.maxArea", "إلى")}</Label>
          <Input
            type="number"
            className="h-9 w-24"
            value={reMaxArea ?? ""}
            onChange={(e) => setReMaxArea(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{t("realEstate.bedroomsMin", "غرف +")}</Label>
          <Input
            type="number"
            className="h-9 w-20"
            min={0}
            value={reBedroomsMin ?? ""}
            onChange={(e) => setReBedroomsMin(e.target.value)}
          />
        </div>

      </div>
    </div>
  )
}
