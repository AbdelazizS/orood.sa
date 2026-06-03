import { Link } from "react-router-dom"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import {
  ProductCard,
  WHOLESALE_LIST_ROW_HEIGHT,
  WHOLESALE_LIST_THUMB_WIDTH,
} from "@/components/feed/cards/ProductCard"
import {
  hasActiveWholesaleReservation,
  isWholesaleProductOwner,
  isWholesaleReservationPaymentPending,
  canCancelWholesaleReservation,
  isWholesaleReservationPurchased,
} from "@/lib/wholesaleAccess"
import { WholesaleQtyStepper } from "@/components/wholesale/WholesaleQtyStepper"

function formatSarPrice(price) {
  if (price === null || price === undefined) return null
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Wholesale list row — homepage ProductCard layout + wholesale progress, dual price, CTA.
 */
export function WholesaleFeedRow({
  product,
  user = null,
  t,
  onReserve,
  onCancel,
  reservePending = false,
  cancelPending = false,
  hideActions = false,
}) {
  const { t: tBase } = useTranslation()
  const isOwner = isWholesaleProductOwner(user, product)
  const hasActiveMine = hasActiveWholesaleReservation(product)
  const isCompleted = Boolean(product?.campaign_completed)
  const canCancel = canCancelWholesaleReservation(product)
  const canReserve = !isOwner && !hasActiveMine && !isCompleted && Number(product?.remaining_needed ?? 0) > 0
  const remaining = Math.max(0, Number(product?.remaining_needed ?? 0))
  const maxRowQty = Math.max(1, remaining || 1)
  const [rowQty, setRowQty] = useState(1)
  useEffect(() => {
    setRowQty((q) => Math.min(Math.max(1, q), maxRowQty))
  }, [product?.id, maxRowQty])
  const readyForCheckout =
    isWholesaleReservationPaymentPending(product) && Boolean(product?.my_reservation?.id)
  const purchasedMine = isWholesaleReservationPurchased(product)
  const myPurchaseId = product?.my_reservation?.purchase_id
  const priceValue = Number(product?.price ?? 0)
  const wholesaleValue = Number(product?.wholesale_price ?? 0)
  const discount = Number(product?.discount_percent ?? 0)

  const formatMoney = (value) =>
    Number.isFinite(value) && value > 0 ? formatSarPrice(value) : null

  const ctaBase =
    "w-full min-w-0 max-w-full justify-center gap-1.5 whitespace-normal rounded-lg px-3 py-2.5 text-center text-sm font-medium leading-snug min-h-11 sm:min-h-8 sm:px-3 sm:py-1.5 sm:text-sm sm:leading-normal sm:whitespace-nowrap"

  const cta = (() => {
    if (isOwner && !hasActiveMine) {
      return (
        <Button type="button" variant="outline" size="sm" className={ctaBase} disabled>
          {t("wholesale.market.ownerListing")}
        </Button>
      )
    }
    if (purchasedMine && myPurchaseId) {
      return (
        <Button type="button" size="sm" variant="secondary" className={ctaBase} asChild>
          <Link to={`/dashboard/orders/${myPurchaseId}`} onClick={(e) => e.stopPropagation()}>
            {t("wholesale.myReservations.openOrder")}
          </Link>
        </Button>
      )
    }
    if (readyForCheckout && product?.my_reservation?.id) {
      return (
        <div className="flex w-full min-w-0 flex-col gap-2">
          <Button type="button" size="sm" className={ctaBase} asChild>
            <Link to={`/wholesale/checkout/${product.my_reservation.id}`} onClick={(e) => e.stopPropagation()}>
              {t("wholesale.market.goToCheckout")}
            </Link>
          </Button>
          {canCancel ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(ctaBase, "border-red-200 text-red-700 dark:border-red-500/20 dark:text-red-300")}
              disabled={cancelPending}
              onClick={(e) => {
                e.stopPropagation()
                onCancel?.(product)
              }}
            >
              {t("wholesale.market.cancelReserve")}
            </Button>
          ) : null}
        </div>
      )
    }
    if (canCancel) {
      return (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className={ctaBase}
          disabled={cancelPending}
          onClick={() => onCancel?.(product)}
        >
          {t("wholesale.market.cancelReserve")}
        </Button>
      )
    }
    if (canReserve) {
      return (
        <div className="flex w-full min-w-0 flex-col items-stretch gap-2">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[10px] text-muted-foreground sm:text-xs">{t("wholesale.detail.quantityLabel")}</span>
            <WholesaleQtyStepper
              value={rowQty}
              min={1}
              max={maxRowQty}
              onChange={setRowQty}
              disabled={reservePending}
              compact
              onSetMax={() => setRowQty(maxRowQty)}
              maxLinkLabel={t("wholesale.detail.stepperMax")}
              maxAriaLabel={t("wholesale.detail.stepperMaxAria", { max: maxRowQty })}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className={ctaBase}
            disabled={reservePending}
            onClick={() => onReserve?.(product, rowQty)}
          >
            <Users className="size-4 shrink-0" />
            {t("wholesale.market.reserve")}
          </Button>
        </div>
      )
    }
    if (isCompleted) {
      return (
        <Button type="button" size="sm" variant="secondary" className={cn(ctaBase, "gap-1")} disabled>
          <CheckCircle2 className="size-4 shrink-0" />
          {t("wholesale.market.completedAwaitCheckout")}
        </Button>
      )
    }
    return (
      <Button type="button" size="sm" variant="secondary" className={ctaBase} disabled>
        {t("wholesale.market.reservationClosed")}
      </Button>
    )
  })()

  const pillEndSlot =
    discount > 0 || hasActiveMine || product?.user_reserved ? (
      <>
        {discount > 0 ? (
          <span className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted/60">
            {t("wholesale.market.discountBadge", { percent: discount })}
          </span>
        ) : null}
        {hasActiveMine || product?.user_reserved ? (
          <span className="shrink-0 rounded border border-border bg-transparent px-1.5 py-0.5 text-[11px] font-medium text-primary">
            {t("wholesale.market.reservedBadge")}
          </span>
        ) : null}
      </>
    ) : null

  const preMetaSlot = (
    <div className="min-w-0 space-y-1 overflow-hidden text-[11px] text-muted-foreground sm:text-xs">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate">{t("wholesale.market.remainingBuyers", { count: product?.remaining_needed ?? 0 })}</span>
        <span className="shrink-0 tabular-nums text-foreground">
          {t("wholesale.market.card.progressCount", {
            current: product?.current_buyers ?? 0,
            min: product?.min_quantity ?? 0,
          })}
        </span>
      </div>
      <Progress value={product?.progress_percentage ?? 0} className="h-1 w-full min-w-0 rounded-full bg-muted" />
    </div>
  )

  const priceSlot = (formatMoney(wholesaleValue) || formatMoney(priceValue)) ? (
    <div className="flex min-w-0 flex-wrap items-baseline gap-2">
      {formatMoney(wholesaleValue) ? (
        <span className="text-base font-medium tabular-nums text-foreground">{formatMoney(wholesaleValue)}</span>
      ) : null}
      {formatMoney(priceValue) ? (
        <span className="text-sm text-muted-foreground line-through">{formatMoney(priceValue)}</span>
      ) : null}
    </div>
  ) : null

  return (
    <ProductCard
      product={product}
      to={`/wholesale/product/${product.id}`}
      articleClassName={WHOLESALE_LIST_ROW_HEIGHT}
      thumbnailColumnClassName={WHOLESALE_LIST_THUMB_WIDTH}
      thumbnailCover
      pillEndSlot={pillEndSlot}
      preMetaSlot={preMetaSlot}
      priceSlot={priceSlot}
      trailingSlot={hideActions ? null : cta}
      stackTrailingBelowOnNarrow={!hideActions}
    />
  )
}
