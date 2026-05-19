import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Separator } from "@/components/ui/separator"

import { isRealEstateListing } from "@/lib/listings/isRealEstateListing"

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

  if (isRealEstateListing(product)) return null

  if (!freeShipping && !freeReturn) return null

  return (
    <>
      <dl dir={direction} className="grid grid-cols-1 gap-3 px-4 py-4 text-sm md:grid-cols-2 sm:px-6">
        {freeShipping && (
          <div className="grid grid-cols-[84px_minmax(0,1fr)] items-start gap-2 sm:gap-3">
            <dt className="pt-0.5 text-start font-semibold text-muted-foreground">
              {t("listingDetail.shipping", "Shipping")}:
            </dt>
            <dd className="min-w-0 text-start leading-relaxed">
              <p className="font-semibold text-primary m-0">
                {t("listingDetail.shippingFree", "Free 2-4 day delivery")}
              </p>
              <p className="m-0 text-xs text-muted-foreground">
                {t("listingDetail.shippingEstimate", "Get it between Thu, Sep 18 and Sat, Sep 20")}
              </p>
              {locationCity ? (
                <p className="m-0 text-xs text-muted-foreground">
                  {t("listingDetail.locatedIn", "Located in")}: {locationCity}
                </p>
              ) : null}
            </dd>
          </div>
        )}
        {freeReturn && (
          <div className="grid grid-cols-[84px_minmax(0,1fr)] items-start gap-2 sm:gap-3">
            <dt className="pt-0.5 text-start font-semibold text-muted-foreground">
              {t("listingDetail.returns", "Returns")}:
            </dt>
            <dd className="min-w-0 text-start text-xs text-muted-foreground leading-relaxed">
              <p className="m-0">
                {returnDays} {t("listingDetail.daysReturns", "days returns")}
              </p>
              <p className="m-0">{t("listingDetail.sellerPaysReturn", "Seller pays for return shipping")}</p>
            </dd>
          </div>
        )}
      </dl>
      <Separator />
    </>
  )
}

