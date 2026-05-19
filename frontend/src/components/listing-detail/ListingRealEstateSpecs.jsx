import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Separator } from "@/components/ui/separator"
import { Home, Maximize2, BedDouble, Bath, MapPin } from "lucide-react"
import { realEstatePurposeLabel, realEstateTypeLabel } from "@/lib/realEstate/labels"
import { isRealEstateListing } from "@/lib/listings/isRealEstateListing"

function SpecItem({ icon: Icon, label, value }) {
  if (value == null || value === "") return null
  return (
    <div className="flex min-w-[7rem] flex-col gap-0.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Icon className="size-3 shrink-0" aria-hidden />
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums text-foreground">{value}</span>
    </div>
  )
}

/** @deprecated Use ListingAdDetailsGrid on the details page (Haraj layout). */
export function ListingRealEstateSpecs({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const re = product?.real_estate
  if (!isRealEstateListing(product) || !re) return null

  return (
    <>
      <div dir={direction} className="px-4 py-3 sm:px-5">
        <div className="flex flex-wrap gap-2">
          <SpecItem
            icon={Home}
            label={t("realEstate.purposeLabel", "الغرض")}
            value={realEstatePurposeLabel(re.purpose, t)}
          />
          <SpecItem
            icon={MapPin}
            label={t("realEstate.typeLabel", "النوع")}
            value={realEstateTypeLabel(re.property_type, t)}
          />
          <SpecItem
            icon={Maximize2}
            label={t("realEstate.areaLabel", "المساحة")}
            value={re.area_sqm ? `${re.area_sqm} م²` : null}
          />
          <SpecItem
            icon={BedDouble}
            label={t("realEstate.bedrooms", "غرف")}
            value={re.bedrooms != null ? String(re.bedrooms) : null}
          />
          <SpecItem
            icon={Bath}
            label={t("realEstate.bathrooms", "حمامات")}
            value={re.bathrooms != null ? String(re.bathrooms) : null}
          />
        </div>
      </div>
      <Separator />
    </>
  )
}
