import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

/**
 * Section 10 — Shipping Info.
 * Label: value pairs. Shipping, Returns, Payments.
 */
export function ShippingInfo({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const freeShipping = product?.free_shipping ?? product?.shipping_details?.free_shipping ?? false
  const freeReturn = product?.free_return ?? product?.shipping_details?.free_return ?? false
  const returnDays = product?.return_days ?? product?.shipping_details?.return_days ?? 30
  const locationCity = product?.location_city ?? product?.city?.name ?? ""

  if (!freeShipping && !freeReturn) return null

  return (
    <>
      <dl dir={direction} className="space-y-2 px-4 py-4 text-sm sm:px-6">
        {freeShipping && (
          <div className="flex items-start gap-3">
            <dd className="flex-1 text-start">
              <span className="font-semibold text-primary">
                {t("listingDetail.shippingFree", "Free 2-4 day delivery")}
              </span>
              <br />
              <span className="text-xs text-muted-foreground">
                {t("listingDetail.shippingEstimate", "Get it between Thu, Sep 18 and Sat, Sep 20")}
              </span>
              <br />
              <span className="text-xs text-muted-foreground">
                {t("listingDetail.locatedIn", "Located in")}: {locationCity}
              </span>
            </dd>
            <dt className="w-20 shrink-0 font-semibold text-muted-foreground">
              {t("listingDetail.shipping", "Shipping")}:
            </dt>
          </div>
        )}
        {freeReturn && (
          <div className="flex items-start gap-3">
            <dd className="flex-1 text-start text-xs text-muted-foreground">
              {returnDays} {t("listingDetail.daysReturns", "days returns")}.
              {t("listingDetail.sellerPaysReturn", "Seller pays for return shipping")}.
              <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary">
                {t("listingDetail.seeDetails", "See details")}
              </Button>
            </dd>
            <dt className="w-20 shrink-0 font-semibold text-muted-foreground">
              {t("listingDetail.returns", "Returns")}:
            </dt>
          </div>
        )}
      </dl>
      <Separator />
    </>
  )
}

