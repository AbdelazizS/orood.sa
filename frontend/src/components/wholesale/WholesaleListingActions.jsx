import { Link } from "react-router-dom"
import { format } from "date-fns"
import { ar as arLocale, enUS } from "date-fns/locale"
import { Trans, useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  hasActiveWholesaleReservation,
  isWholesaleProductOwner,
  isWholesaleReservationPaymentPending,
  canCancelWholesaleReservation,
  isWholesaleReservationPurchased,
} from "@/lib/wholesaleAccess"
import { WholesaleQtyStepper } from "@/components/wholesale/WholesaleQtyStepper"
import { WHOLESALE_CHECKOUT_WINDOW_HOURS } from "@/lib/wholesaleCheckoutWindow"

function formatMoney(value, locale) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return String(Math.round(n))
  }
}

/**
 * Wholesale-only actions (reserve / cancel / checkout). Not shown to listing owner.
 */
export function WholesaleListingActions({
  product,
  user,
  reserveQty,
  onReserveQtyChange,
  onReserveClick,
  onCancelClick,
  reservePending = false,
  cancelPending = false,
  className,
  trailingSeparator = true,
  hideSectionTitle = false,
}) {
  const { t, i18n } = useTranslation()
  const { direction } = useAppDirection()
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-SA"

  if (!product) return null

  const isOwner = isWholesaleProductOwner(user, product)
  const hasActiveMine = hasActiveWholesaleReservation(product)
  const isCompleted = Boolean(product.campaign_completed)
  const remainingNeeded = Math.max(0, Number(product.remaining_needed ?? 0))
  const maxQty = Math.max(1, remainingNeeded || 1)
  const unit = Number(product.wholesale_price ?? 0)
  const clampedQty = Math.min(maxQty, Math.max(1, reserveQty))
  const lineTotal =
    Number.isFinite(unit) && unit > 0 && clampedQty > 0 ? formatMoney(unit * clampedQty, locale) : null
  const unitLabel = Number.isFinite(unit) && unit > 0 ? formatMoney(unit, locale) : null

  if (isOwner) {
    return (
      <>
        <div dir={direction} className="space-y-4 px-4 py-4 sm:px-6">
          <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {t("wholesale.detail.ownerManageHint")}
          </p>
          <Button variant="default" className="w-full min-h-11" asChild>
            <Link to="/dashboard/wholesale">{t("wholesale.detail.ownerDashboardCta")}</Link>
          </Button>
        </div>
        <Separator />
      </>
    )
  }

  const readyForCheckout = isWholesaleReservationPaymentPending(product)
  const canCancel = canCancelWholesaleReservation(product)
  const purchasedMine = isWholesaleReservationPurchased(product)
  const myPurchaseId = product?.my_reservation?.purchase_id
  const canReserve = !hasActiveMine && !isCompleted && remainingNeeded > 0

  return (
    <>
      <div dir={direction} className={cn("space-y-4 px-4 py-4 sm:px-6", className)}>
        {!hideSectionTitle ? (
          <h2 className="text-base font-semibold text-start">{t("wholesale.detail.actionsTitle")}</h2>
        ) : null}

        {hasActiveMine && product?.my_reservation ? (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">{t("wholesale.detail.yourReservationTitle")}</p>
            <p className="mt-1 text-muted-foreground">
              {t("wholesale.detail.yourReservationLine", {
                qty: product.my_reservation.quantity,
                status: readyForCheckout
                  ? t("wholesale.detail.statusCheckoutOpen")
                  : t("wholesale.detail.statusAwaitingGroup"),
              })}
            </p>
          </div>
        ) : null}

        {(product.participants ?? []).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {product.participants.map((row) => (
              <Badge key={row.id} variant="outline">
                {row.user?.name ?? t("common.member")} × {row.quantity}
              </Badge>
            ))}
          </div>
        ) : null}

        {purchasedMine && myPurchaseId ? (
          <>
            <Button className="w-full min-h-11 sm:min-h-10" variant="secondary" asChild>
              <Link to={`/dashboard/orders/${myPurchaseId}`}>{t("wholesale.myReservations.openOrder")}</Link>
            </Button>
            <p className="text-xs text-muted-foreground">{t("wholesale.detail.purchasedReservationHint")}</p>
          </>
        ) : readyForCheckout && product?.my_reservation?.id ? (
          <>
            <Button className="w-full min-h-11 sm:min-h-10" asChild>
              <Link to={`/wholesale/checkout/${product.my_reservation.id}`}>{t("wholesale.market.goToCheckout")}</Link>
            </Button>
            {canCancel ? (
              <Button
                type="button"
                variant="outline"
                className="w-full min-h-11 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 sm:min-h-10 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                onClick={onCancelClick}
                disabled={cancelPending}
              >
                {t("wholesale.market.cancelReserve")}
              </Button>
            ) : null}
          </>
        ) : canCancel ? (
          <>
            <Button
              type="button"
              variant="destructive"
              className="w-full min-h-11 sm:min-h-10"
              onClick={onCancelClick}
              disabled={cancelPending}
            >
              {t("wholesale.market.cancelReserve")}
            </Button>
          </>
        ) : canReserve ? (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("wholesale.detail.beforeReserveHint", {
                checkoutHours: WHOLESALE_CHECKOUT_WINDOW_HOURS,
              })}
            </p>
            {product?.wholesale_expires_at &&
            !Number.isNaN(Date.parse(String(product.wholesale_expires_at))) ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("wholesale.detail.campaignEndsHint", {
                  date: format(new Date(product.wholesale_expires_at), "PP", {
                    locale: i18n.language?.startsWith("ar") ? arLocale : enUS,
                  }),
                })}
              </p>
            ) : null}
            <div className={cn("flex flex-col gap-4 rounded-2xl border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between")}>
              <div className="flex flex-col gap-2 text-start">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("wholesale.detail.quantityLabel")}
                </span>
                <WholesaleQtyStepper
                  value={clampedQty}
                  min={1}
                  max={maxQty}
                  onChange={onReserveQtyChange}
                  disabled={reservePending}
                  onSetMax={() => onReserveQtyChange?.(maxQty)}
                  maxLinkLabel={t("wholesale.detail.stepperMax")}
                  maxAriaLabel={t("wholesale.detail.stepperMaxAria", { max: maxQty })}
                />
              </div>
              <Button
                type="button"
                className="w-full min-h-12 shrink-0 rounded-xl text-base font-semibold sm:w-auto sm:min-w-[11rem]"
                onClick={onReserveClick}
                disabled={reservePending}
              >
                {t("wholesale.market.reserve")}
              </Button>
            </div>
            {lineTotal && unitLabel ? (
              <p className="text-center text-sm tabular-nums text-muted-foreground sm:text-start">
                {t("wholesale.detail.lineTotal", { qty: clampedQty, unit: unitLabel, total: lineTotal })}
              </p>
            ) : null}
          </div>
        ) : isCompleted ? (
          <>
            <Button type="button" className="w-full min-h-11" variant="secondary" disabled>
              {t("wholesale.market.completedAwaitCheckout")}
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              <Trans
                i18nKey="wholesale.detail.groupCompleteHint"
                components={{
                  link: (
                    <Link
                      to="/wholesale/reservations"
                      className="font-medium text-primary underline underline-offset-2 hover:underline"
                    />
                  ),
                }}
              />
            </p>
          </>
        ) : (
          <Button type="button" className="w-full min-h-11" variant="secondary" disabled>
            {t("wholesale.market.reservationClosed")}
          </Button>
        )}
      </div>
      {trailingSeparator ? <Separator /> : null}
    </>
  )
}
