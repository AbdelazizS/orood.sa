import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { StarRating } from "@/components/ui/StarRating"
import { resolveImageUrl } from "@/lib/imageUrl"
import { timeAgo } from "@/lib/timeAgo"
import { getSellerPresenceUi } from "@/lib/sellerPresence"
import { publicProfilePath } from "@/lib/profileRoutes"
import { useAuthStore } from "@/store/useAuthStore"
import { MapPin, ShieldCheck, Eye, Clock, Users } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Wholesale product detail — seller column + wholesale price / progress (no bids).
 * @param {{ product: object, variant?: "default" | "panel" }} props — `panel`: single column for narrow sticky deal rail.
 */
export function WholesaleDetailHeroSection({ product, variant = "default" }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const { user, token } = useAuthStore()
  const seller = product?.seller
  if (!seller) return null

  const isSelfSeller = Boolean(token && user?.id === seller?.id)
  const stats = product?.stats ?? {}
  const viewCount = product?.view_count ?? stats.views ?? stats.view_count ?? 0

  const cityName = product?.city?.name ?? seller.city?.name ?? product?.location ?? ""
  const presence = getSellerPresenceUi(seller, t, { isSelfSeller })
  const rating = Number(seller.rating ?? seller.reviews_avg ?? 0)
  const totalRatings = Number(seller.total_ratings ?? 0)
  const isVerified = seller.is_verified ?? seller.email_verified
  const displayName = seller.username?.trim() || seller.name?.trim() || "?"

  const price = Number(product?.price ?? 0)
  const wholesale = Number(product?.wholesale_price ?? 0)
  const discount = Number(product?.discount_percent ?? 0)
  const progress = Number(product?.progress_percentage ?? 0)
  const reservedSeats = Number(product?.reserved_seats ?? product?.current_buyers ?? 0)
  const remaining = Number(product?.remaining_needed ?? 0)
  const minQ = Number(product?.min_quantity ?? 0)

  const formatPrice = (val) => {
    if (val == null || val === "") return "—"
    const n = Number(val)
    if (Number.isNaN(n)) return "—"
    return `${Math.round(n).toLocaleString()} ${t("common.currency", "ريال")}`
  }

  const listingAgeSource = product?.published_at || product?.created_at
  const listingAgeTime = listingAgeSource ? timeAgo(listingAgeSource, t) : ""
  const isPanel = variant === "panel"

  return (
    <>
      <div
        dir={direction}
        className={cn(
          "grid grid-cols-1 gap-4 border-b border-border px-4 py-3 md:items-start",
          !isPanel && "md:grid-cols-2"
        )}
      >
        <div className="flex min-w-0 flex-col gap-2 text-start">
          <div className="flex items-center gap-2">
            <Avatar className="size-9 shrink-0">
              {seller.avatar_url ? (
                <AvatarImage src={resolveImageUrl(seller.avatar_url)} alt="" />
              ) : null}
              <AvatarFallback className="bg-primary text-sm text-primary-foreground">
                {displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <Link
              to={publicProfilePath(seller) ?? "/"}
              className="min-w-0 truncate text-sm font-semibold text-foreground hover:underline"
            >
              {displayName}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {cityName ? (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="size-3 shrink-0" aria-hidden />
                {cityName}
              </span>
            ) : null}
            {isSelfSeller ? (
              <span className="text-xs text-muted-foreground">
                {t("listingDetail.youArePublisher", "أنت صاحب هذا العرض")}
              </span>
            ) : presence.showOnline ? (
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-500">
                <span className="size-2 shrink-0 rounded-full bg-green-500" aria-hidden />
                {t("listingDetail.onlineNow", "متصل الآن")}
              </span>
            ) : presence.showOfflineBadge ? (
              <Badge variant="outline" className="h-5 border-border px-1.5 py-0 text-[11px] font-normal">
                {t("listingDetail.offline", "غير متصل")}
              </Badge>
            ) : null}
            {isVerified ? (
              <Badge variant="outline" className="h-5 gap-0.5 border-primary px-1.5 py-0 text-[11px] text-primary">
                <ShieldCheck className="size-3 shrink-0" aria-hidden />
                {t("listingDetail.verified", "موثق")}
              </Badge>
            ) : null}
          </div>

          {!isSelfSeller && !presence.showOnline && presence.lastSeenParagraph ? (
            <p className="text-xs text-muted-foreground">{presence.lastSeenParagraph}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {listingAgeTime ? (
              <span className="inline-flex items-center gap-0.5" title={t("listingDetail.listingAgeHint", "وقت نشر الإعلان وليس نشاط البائع")}>
                <Clock className="size-3 shrink-0" aria-hidden />
                <span className="tabular-nums">
                  {t("listingDetail.listingPublishedAgo", {
                    time: listingAgeTime,
                    defaultValue: "{{time}}",
                  })}
                </span>
              </span>
            ) : null}
            <span className="inline-flex flex-wrap items-center gap-1">
              <StarRating
                value={rating}
                readonly
                size="xs"
                showValue={totalRatings > 0}
                className="text-yellow-500"
              />
              {totalRatings > 0 ? (
                <span className="font-medium tabular-nums text-muted-foreground">
                  {t("listingDetail.reviewCountParen", { count: totalRatings, defaultValue: "({{count}})" })}
                </span>
              ) : (
                <span className="font-medium tabular-nums text-muted-foreground">
                  {t("listingDetail.reviewsEmptyParen", "(0 تقييمات)")}
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 text-start">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-bold tabular-nums text-primary sm:text-2xl">
              {Number.isFinite(wholesale) && wholesale > 0 ? formatPrice(wholesale) : "—"}
            </span>
            {Number.isFinite(price) && price > 0 ? (
              <span className="text-sm text-muted-foreground line-through tabular-nums">{formatPrice(price)}</span>
            ) : null}
            {discount > 0 ? (
              <Badge variant="secondary" className="shrink-0">
                {t("wholesale.market.discountBadge", { percent: discount })}
              </Badge>
            ) : null}
          </div>
          <span className="text-xs text-muted-foreground">{t("wholesale.detail.heroWholesaleCaption", "Wholesale unit price")}</span>

          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5 shrink-0" aria-hidden />
                {t("wholesale.market.remainingSeats", { count: remaining })}
              </span>
              <span className="tabular-nums font-medium text-foreground">
                {t("wholesale.market.card.progressCount", { current: reservedSeats, min: minQ })}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <span>
                {t("listingDetail.heroViews", "المشاهدات")}: {viewCount}
              </span>
              <Eye className="size-3.5 shrink-0 opacity-80" aria-hidden />
            </span>
          </div>
        </div>
      </div>
      {!isPanel ? <Separator /> : null}
    </>
  )
}
