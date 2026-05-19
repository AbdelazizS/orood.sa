import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { ListingImage } from "@/components/listings/ListingImage"
import { realEstateTypeLabel } from "@/lib/realEstate/labels"
import { MapPin } from "lucide-react"

export function ListingReHeroMedia({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const re = product?.real_estate
  const imageUrl =
    product?.media?.image_url ??
    (Array.isArray(product?.media?.gallery) ? product.media.gallery[0] : null)

  const typeLabel = re?.property_type ? realEstateTypeLabel(re.property_type, t) : null

  return (
    <div dir={direction} className="bg-card px-4 pb-3">
      <div className="relative overflow-hidden rounded-xl bg-muted">
        {imageUrl ? (
          <ListingImage
            src={imageUrl}
            alt={product?.title}
            product={product}
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <ListingImage
            product={product}
            alt={product?.title}
            showIconFallback
            className="aspect-[4/3] w-full"
          />
        )}
        {typeLabel ? (
          <div
            className="absolute bottom-3 start-1/2 flex -translate-x-1/2 flex-col items-center rtl:translate-x-1/2"
            aria-hidden
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
              <MapPin className="size-5" />
            </div>
            <span className="mt-1 rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow">
              {typeLabel}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

