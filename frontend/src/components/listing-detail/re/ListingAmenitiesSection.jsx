import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Separator } from "@/components/ui/separator"
import { Check } from "lucide-react"
import { resolveFieldLabel } from "@/components/listing-detail/ListingAttributesGrid"

export function ListingAmenitiesSection({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const amenities = product?.real_estate?.amenities
  const list = Array.isArray(amenities) ? amenities.filter(Boolean) : []
  if (!list.length) return null

  return (
    <>
      <section dir={direction} className="px-4 py-4 sm:px-6">
        <h2 className="mb-3 text-start text-sm font-semibold text-foreground">
          {t("listingDetail.re.featuresTitle")}
        </h2>
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 shadow-sm">
          <ul className="grid grid-cols-2 gap-x-3 gap-y-3">
            {list.map((item, i) => (
              <li key={`${item}-${i}`} className="flex items-center gap-2 text-start text-sm">
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white"
                  aria-hidden
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span className="text-foreground">
                  {resolveFieldLabel({ field_key: item, label: item }, t)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <Separator />
    </>
  )
}
