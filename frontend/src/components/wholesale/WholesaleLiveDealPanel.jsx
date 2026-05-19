import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/imageUrl"
import { isWholesaleShareable } from "@/lib/wholesaleShare"
import { WholesaleDealCountdown } from "@/components/wholesale/WholesaleDealCountdown"
import { WholesaleDealActivity } from "@/components/wholesale/WholesaleDealActivity"
import { WholesaleShareControl } from "@/components/wholesale/WholesaleShareControl"
import { WholesaleListingActions } from "@/components/wholesale/WholesaleListingActions"
import {
  hasActiveWholesaleReservation,
  isWholesaleProductOwner,
} from "@/lib/wholesaleAccess"

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
 * Sticky "live deal" column — pricing, savings, progress, countdown, share, reservation actions.
 */
export function WholesaleLiveDealPanel({
  product,
  user,
  dir = "rtl",
  reserveQty,
  onReserveQtyChange,
  onReserveClick,
  onReserveMaxClick,
  onCancelClick,
  reservePending,
  cancelPending,
  className,
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-SA"

  if (!product) return null

  const seller = product.seller
  const company = seller?.company
  const companyId = company?.id
  const companyName = company?.name?.trim() || seller?.username || seller?.name || ""
  const companyInitial = (companyName[0] ?? "?").toUpperCase()
  const avatar = seller?.avatar_url ? resolveImageUrl(seller.avatar_url) : null
  const city = product?.city?.name ?? seller?.city?.name ?? ""

  const retail = Number(product.price ?? 0)
  const wholesale = Number(product.wholesale_price ?? 0)
  const discountPct = Number(product.discount_percent ?? 0)
  const savings =
    Number.isFinite(retail) && retail > 0 && Number.isFinite(wholesale) && wholesale > 0 && wholesale < retail
      ? retail - wholesale
      : null
  const savingsLabel = savings != null ? formatMoney(savings, locale) : null
  const retailLabel = retail > 0 ? formatMoney(retail, locale) : null
  const wholesaleLabel = wholesale > 0 ? formatMoney(wholesale, locale) : null

  const minQ = Math.max(1, Number(product.min_quantity ?? 1))
  const reserved = Number(product.reserved_seats ?? product.current_buyers ?? 0)
  const remaining = Math.max(0, Number(product.remaining_needed ?? 0))
  const progress = Math.min(100, Number(product.progress_percentage ?? 0))

  const isOwner = isWholesaleProductOwner(user, product)
  const canReserveQuick =
    !isOwner &&
    !product.campaign_completed &&
    remaining > 0 &&
    !hasActiveWholesaleReservation(product) &&
    !product.user_reserved

  return (
    <div dir={dir} className={cn("flex flex-col", className)}>
      <div className="flex items-start gap-3">
        <Avatar className="size-11 shrink-0 border border-border/60">
          {avatar ? <AvatarImage src={avatar} alt="" /> : null}
          <AvatarFallback>{companyInitial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 text-start">
          {companyId ? (
            <Link
              to={`/wholesale/company/${companyId}`}
              className="wholesale-type-caption text-primary hover:underline"
            >
              {companyName || t("wholesale.pdp.viewCompany")}
            </Link>
          ) : (
            <p className="wholesale-type-caption text-muted-foreground">{companyName}</p>
          )}
        </div>
      </div>

      <h1 className="wholesale-type-title mt-4 text-balance">{product.title}</h1>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {product?.category?.name ? <span>{product.category.name}</span> : null}
        {city ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3 shrink-0" aria-hidden />
            {city}
          </span>
        ) : null}
      </div>

      <Separator className="my-5" />

      <div className="space-y-1 text-start">
        <p className="wholesale-type-caption">{t("wholesale.detail.heroWholesaleCaption")}</p>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums tracking-tight text-primary">{wholesaleLabel ?? "—"}</span>
          {retailLabel ? <span className="text-base text-muted-foreground line-through tabular-nums">{retailLabel}</span> : null}
        </div>
        {discountPct > 0 ? (
          <Badge variant="secondary" className="mt-1 rounded-full font-normal">
            {t("wholesale.market.discountBadge", { percent: discountPct })}
          </Badge>
        ) : null}
        {savingsLabel ? (
          <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {t("wholesale.pdp.savingsLine", { amount: savingsLabel })}
          </p>
        ) : null}
      </div>

      <div className="mt-5 space-y-2 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{t("wholesale.market.remainingSeats", { count: remaining })}</span>
          <span className="tabular-nums font-medium text-foreground">
            {t("wholesale.market.card.progressCount", { current: reserved, min: minQ })}
          </span>
        </div>
        <Progress value={progress} className="h-2.5" />
      </div>

      <div className="mt-4">
        <WholesaleDealCountdown expiresAtIso={product.wholesale_expires_at} />
      </div>

      <div className="mt-4">
        <WholesaleDealActivity participants={product.participants} />
      </div>

      {isWholesaleShareable(product) ? (
        <div className="mt-4">
          <WholesaleShareControl product={product} dir={dir} />
        </div>
      ) : null}

      {canReserveQuick && remaining > 1 && onReserveMaxClick ? (
        <Button type="button" variant="outline" className="mt-4 w-full rounded-xl border-dashed" onClick={onReserveMaxClick}>
          {t("wholesale.pdp.reserveAllSpots", { count: remaining })}
        </Button>
      ) : null}

      <div className="mt-4">
        <WholesaleListingActions
          product={product}
          user={user}
          reserveQty={reserveQty}
          onReserveQtyChange={onReserveQtyChange}
          onReserveClick={onReserveClick}
          onCancelClick={onCancelClick}
          reservePending={reservePending}
          cancelPending={cancelPending}
          className="px-0 py-0 sm:px-0"
          trailingSeparator={false}
          hideSectionTitle
        />
      </div>
    </div>
  )
}
