import { Link } from "react-router-dom"
import { useEffect, useState } from "react"
import { motion as Motion, useReducedMotion } from "framer-motion"
import { useTranslation } from "react-i18next"
import {
  Building2,
  CheckCircle2,
  Clock3,
  Users,
  Sparkles,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/imageUrl"
import { isWholesaleShareable } from "@/lib/wholesaleShare"
import {
  hasActiveWholesaleReservation,
  isWholesaleProductOwner,
  isWholesaleReservationPaymentPending,
  canCancelWholesaleReservation,
  isWholesaleReservationPurchased,
} from "@/lib/wholesaleAccess"

import { WholesaleShareControl } from "@/components/wholesale/WholesaleShareControl"
import { WholesaleQtyStepper } from "@/components/wholesale/WholesaleQtyStepper"
import {
  formatExpiryLabel,
  resolvePrimaryStatus,
  sarNumberFormatter,
} from "@/components/wholesale/primitives/wholesaleCardUtils"

export function WholesaleProductCard({
  product,
  user = null,
  t,
  onReserve,
  onCancel,
  reservePending = false,
  cancelPending = false,
  dir = "rtl",
  compactUrgent = false,
  density = "default",
}) {
  const isCompact = density === "compact" || density === "preview"
  const isPreview = density === "preview"
  const { i18n } = useTranslation()

  const reduceMotion = useReducedMotion()

  const money = sarNumberFormatter(dir)

  const isOwner = isWholesaleProductOwner(user, product)

  const hasActiveMine = hasActiveWholesaleReservation(product)

  const isCompleted = Boolean(product?.campaign_completed)

  const remainingNeeded = Number(product?.remaining_needed ?? 0)

  const maxRowQty = Math.max(1, remainingNeeded || 1)
  const [rowQty, setRowQty] = useState(1)
  useEffect(() => {
    setRowQty((q) => Math.min(Math.max(1, q), maxRowQty))
  }, [product?.id, maxRowQty])

  const reservedSeats = Number(product?.reserved_seats ?? product?.current_buyers ?? 0)

  const minQuantity = Number(product?.min_quantity ?? 0)

  const progress = Number(product?.progress_percentage ?? 0)

  const canCancel = canCancelWholesaleReservation(product)

  const canReserve =
    !isOwner &&
    !hasActiveMine &&
    !isCompleted &&
    remainingNeeded > 0

  const readyForCheckout =
    isWholesaleReservationPaymentPending(product) && Boolean(product?.my_reservation?.id)

  const purchasedMine = isWholesaleReservationPurchased(product)
  const myPurchaseId = product?.my_reservation?.purchase_id

  const wholesaleValue = Number(product?.wholesale_price ?? 0)
  const priceValue = Number(product?.price ?? 0)

  const formatMoney = (value) =>
    Number.isFinite(value) && value > 0
      ? money.format(value)
      : t("feed.priceOnRequest")

  const expiryLabel = formatExpiryLabel(product?.wholesale_expires_at, i18n.language)

  const status = resolvePrimaryStatus(product, t)

  const imgSrc = product?.media?.image_url
    ? resolveImageUrl(product.media.image_url)
    : null

  const cta = (() => {
    if (isOwner && !hasActiveMine) {
      return (
        <Button type="button" variant="outline" className="h-11 rounded-2xl text-sm font-medium" disabled>
          {t("wholesale.market.ownerListing")}
        </Button>
      )
    }

    if (purchasedMine && myPurchaseId) {
      return (
        <Button type="button" variant="secondary" className="h-11 rounded-2xl text-sm font-medium" asChild>
          <Link to={`/dashboard/orders/${myPurchaseId}`}>{t("wholesale.myReservations.openOrder")}</Link>
        </Button>
      )
    }

    if (readyForCheckout && product?.my_reservation?.id) {
      return (
        <div className="flex w-full flex-col gap-2">
          <Button type="button" className="h-11 rounded-2xl text-sm font-medium" asChild>
            <Link to={`/wholesale/checkout/${product.my_reservation.id}`}>
              {t("wholesale.market.goToCheckout")}
            </Link>
          </Button>
          {canCancel ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl border-red-200 bg-red-50 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
              onClick={() => onCancel?.(product)}
              disabled={cancelPending}
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
          variant="outline"
          className="h-11 rounded-2xl border-red-200 bg-red-50 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
          onClick={() => onCancel?.(product)}
          disabled={cancelPending}
        >
          {t("wholesale.market.cancelReserve")}
        </Button>
      )
    }

    if (canReserve) {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{t("wholesale.detail.quantityLabel")}</span>
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
            className="h-11 rounded-2xl text-sm font-medium shadow-sm"
            onClick={() => onReserve?.(product, rowQty)}
            disabled={reservePending}
          >
            <Users className="me-2 size-4 shrink-0" />
            {t("wholesale.market.reserve")}
          </Button>
        </div>
      )
    }

    if (isCompleted) {
      return (
        <Button
          type="button"
          disabled
          variant="secondary"
          className="h-11 rounded-2xl text-sm font-medium"
        >
          <CheckCircle2 className="me-2 size-4" />
          {t(
            "wholesale.market.completedAwaitCheckout"
          )}
        </Button>
      )
    }

    return (
      <Button
        type="button"
        disabled
        variant="secondary"
        className="h-11 rounded-2xl text-sm font-medium"
      >
        {t(
          "wholesale.market.reservationClosed"
        )}
      </Button>
    )
  })()

  const coverClassName = cn(
    "relative block w-full shrink-0 overflow-hidden bg-muted/25 dark:bg-muted/15",
    compactUrgent ? "aspect-[4/3] max-h-[200px] sm:max-h-[220px]" : "aspect-[4/3] sm:aspect-[5/4]"
  )

  const titleClassName = cn(
    "line-clamp-2 font-semibold leading-snug text-foreground",
    isPreview ? "" : "transition-colors hover:text-primary",
    isCompact ? "text-base" : "text-[18px] leading-[1.5] tracking-[-0.02em] md:text-[20px]"
  )

  const coverContent = (
    <>
        {status ? (
          <div className="absolute start-3 top-3 z-20">
            <Badge
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium shadow-sm",
                status.className
              )}
            >
              {status.label}
            </Badge>
          </div>
        ) : null}

        <div className="absolute end-3 top-3 z-20">
          <Badge className="rounded-full border-transparent bg-black px-3 py-1 text-[11px] font-semibold text-white dark:bg-white dark:text-black">
            {t(
              "wholesale.market.discountBadge",
              {
                percent:
                  product?.discount_percent ?? 0,
              }
            )}
          </Badge>
        </div>

        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product?.title ?? ""}
            className={cn(
              "absolute inset-0 size-full object-cover object-center transition-transform duration-500",
              !isPreview && !reduceMotion && "group-hover:scale-[1.03]"
            )}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
            <Building2 className="size-10 text-muted-foreground" />
          </div>
        )}
    </>
  )

  const card = (
    <Card
      dir={dir}
      className={cn(
        "group flex h-full min-w-0 flex-col gap-0 overflow-hidden rounded-[28px] border border-black/5 bg-background py-0 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_12px_32px_rgba(0,0,0,0.04)] transition-all duration-300",
        !isPreview &&
          !reduceMotion &&
          !isCompact &&
          "hover:-translate-y-1 hover:shadow-[0_6px_24px_rgba(0,0,0,0.06),0_24px_48px_rgba(0,0,0,0.08)]",
        !isPreview && isCompact && !reduceMotion && "transition-shadow hover:shadow-md hover:ring-1 hover:ring-border/80"
      )}
    >
      {isPreview ? (
        <div className={cn(coverClassName, "pointer-events-none")} aria-hidden>
          {coverContent}
        </div>
      ) : (
        <Link to={`/wholesale/product/${product.id}`} className={coverClassName}>
          {coverContent}
        </Link>
      )}

      <CardContent
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          isCompact ? "gap-2.5 px-3 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5" : "gap-4 px-4 pb-4 pt-3 sm:gap-5 sm:px-5 sm:pb-5 sm:pt-4 md:px-6 md:pb-6 md:pt-4"
        )}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium tracking-wide text-muted-foreground">
                {product?.seller?.company?.name ??
                  product?.seller?.name ??
                  t("common.member")}
              </p>
            </div>

            {expiryLabel ? (
              <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" />
                <span>
                  {t(
                    "wholesale.market.card.endsIn",
                    {
                      time: expiryLabel,
                    }
                  )}
                </span>
              </div>
            ) : null}
          </div>

          {isPreview ? (
            <p className={titleClassName}>{product?.title}</p>
          ) : (
            <Link to={`/wholesale/product/${product.id}`} className={titleClassName}>
              {product?.title}
            </Link>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-1">
            <span className="min-w-0 truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-[26px] md:tracking-[-0.02em]">
              {formatMoney(wholesaleValue)}
            </span>

            {Number.isFinite(priceValue) && priceValue > 0 ? (
              <span className="pb-0.5 text-xs text-muted-foreground line-through sm:text-sm">
                {formatMoney(priceValue)}
              </span>
            ) : null}
          </div>

          {!isCompact ? (
            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <Sparkles className="size-3.5" />
              <span>{t("wholesale.market.card.groupDiscountActivated")}</span>
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "min-w-0 rounded-2xl bg-muted/[0.45] dark:bg-white/[0.03]",
            isCompact ? "space-y-2 p-2.5" : "space-y-3 p-4"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {t("wholesale.market.card.seatsReservedLine", { count: reservedSeats })}
              </p>

              <p className="text-xs text-muted-foreground">
                {t("wholesale.market.remainingSeats", {
                  count: remainingNeeded,
                })}
              </p>
            </div>

            <div className="rounded-full bg-background px-3 py-1.5 text-sm font-semibold tabular-nums shadow-sm dark:bg-black/20">
              {t("wholesale.market.card.progressCount", {
                current: reservedSeats,
                min: minQuantity,
              })}
            </div>
          </div>

          <Progress
            value={progress}
            className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10"
          />
        </div>

        {!isCompact && isWholesaleShareable(product) ? (
          <WholesaleShareControl product={product} dir={dir} />
        ) : null}

        <div className="pt-0.5">
          {isCompact ? (
            <Button
              type="button"
              variant="default"
              className="h-10 w-full rounded-xl text-sm font-medium"
              asChild={!isPreview}
              disabled={isPreview}
            >
              {isPreview ? (
                <span>{t("wholesale.card.viewOffer")}</span>
              ) : (
                <Link to={`/wholesale/product/${product.id}`}>{t("wholesale.card.viewOffer")}</Link>
              )}
            </Button>
          ) : (
            cta
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (reduceMotion) {
    return <div className="h-full min-w-0">{card}</div>
  }

  return (
    <Motion.div
      className="min-w-0 h-full"
      initial={false}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 24,
      }}
    >
      {card}
    </Motion.div>
  )
}
