import { useTranslation } from "react-i18next"
import { Truck, RotateCcw, MapPin } from "lucide-react"

export function ProductOptionsDisplay({ shippingDetails = {} }) {
  const { t } = useTranslation()
  const freeShipping = shippingDetails.free_shipping ?? false
  const freeReturn = shippingDetails.free_return ?? false
  const viewAtClient = shippingDetails.view_at_client ?? false

  if (!freeShipping && !freeReturn && !viewAtClient) return null

  return (
    <div className="flex flex-wrap gap-3">
      {freeShipping && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
          <Truck className="size-4" />
          {t("addOffer.freeShipping")}
        </span>
      )}
      {freeReturn && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
          <RotateCcw className="size-4" />
          {t("addOffer.freeReturn")}
        </span>
      )}
      {viewAtClient && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
          <MapPin className="size-4" />
          {t("addOffer.viewAtClient")}
        </span>
      )}
    </div>
  )
}
