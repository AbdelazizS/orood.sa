import { useTranslation } from "react-i18next"
import { useAuthStore } from "@/store/useAuthStore"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Separator } from "@/components/ui/separator"

/**
 * Section 2 — Price Row.
 * RTL flex row, justify-between. px-4 py-3. No card, no border.
 */
export function ListingPriceRow({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const { user, token } = useAuthStore()

  const { price, accept_bids, bids_visible } = product ?? {}
  const isOwner = token && (user?.id === product?.seller?.id || user?.id === product?.user_id)
  const hasPrice = price != null && price > 0
  const showBid = accept_bids && (bids_visible || isOwner)
  const currentBid = product?.highest_bid ?? product?.bids?.[0]?.amount

  if (!hasPrice) return null

  const formatPrice = (val) => {
    if (val == null) return "—"
    return `${val} ${t("common.currency", "ريال")}`
  }

  return (
    <>
      <div
        dir={direction}
        className="flex items-start justify-between gap-4 px-4 py-4 sm:px-6"
      >
        <div className="flex flex-col gap-0.5 text-start">
          <span className="text-xs text-muted-foreground">
            {t("listingDetail.requiredAmount", "المبلغ المطلوب")}
          </span>
          <span className="text-xl font-bold text-foreground">
            {formatPrice(price)}
          </span>
        </div>
        {showBid && (
          <div className="flex flex-col items-end gap-0.5 text-end">
            <span className="text-xs text-muted-foreground">
              {t("listingDetail.bidAmount", "وصل المبلغ ( السوم )")}
            </span>
            <span className="text-xl font-bold text-primary">
              {currentBid != null ? formatPrice(currentBid) : "—"}
            </span>
          </div>
        )}
      </div>
      <Separator />
    </>
  )
}
