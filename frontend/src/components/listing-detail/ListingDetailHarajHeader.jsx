import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StarRating } from "@/components/ui/StarRating"
import { resolveImageUrl } from "@/lib/imageUrl"
import { timeAgo } from "@/lib/timeAgo"
import { publicProfilePath } from "@/lib/profileRoutes"
import { useAuthStore } from "@/store/useAuthStore"
import { MapPin, ShieldCheck, Eye, MessageCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { AccountKindBadge } from "@/components/profile/AccountKindBadge"

/**
 * Haraj-style listing header: title → city·time → seller → price·stats.
 * Extended seller trust (orders, ratings) on md+ only.
 */
export function ListingDetailHarajHeader({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const { user, token } = useAuthStore()
  const seller = product?.seller
  if (!seller) return null

  const title = product?.title?.trim() ?? ""
  const isOwner = Boolean(token && (user?.id === seller?.id || user?.id === product?.user_id))
  const isSelfSeller = Boolean(token && user?.id === seller?.id)
  const stats = product?.stats ?? {}
  const viewCount = product?.view_count ?? stats.views ?? stats.view_count ?? 0
  const repliesCount = stats.comments ?? 0

  const cityName = product?.city?.name ?? seller.city?.name ?? product?.location ?? ""
  const completedOrders = seller.completed_orders ?? 0
  const rating = Number(seller.rating ?? seller.reviews_avg ?? 0)
  const totalRatings = Number(seller.total_ratings ?? 0)
  const isVerified = seller.is_verified ?? seller.email_verified
  const displayName = seller.username?.trim() || seller.name?.trim() || "?"

  const { price, accept_bids: biddingEnabled, bids_visible: biddingVisible } = product ?? {}
  const hasPrice = price != null && Number(price) > 0
  const showBidSide = Boolean(biddingEnabled && (biddingVisible || isOwner))
  const currentBid = product?.highest_bid ?? product?.bids?.[0]?.amount

  const formatPrice = (val) => {
    if (val == null || val === "") return "—"
    const n = Number(val)
    if (Number.isNaN(n)) return "—"
    return `${Math.round(n).toLocaleString()} ${t("common.currency", "ريال")}`
  }

  const listingAgeSource = product?.published_at || product?.created_at
  const listingAgeTime = listingAgeSource ? timeAgo(listingAgeSource, t) : ""

  const statsInline = (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground tabular-nums">
      <span className="inline-flex items-center gap-0.5">
        <Eye className="size-3 shrink-0 opacity-80" aria-hidden />
        {t("listingDetail.heroViews", "المشاهدات")}: {viewCount}
      </span>
      <span className="text-muted-foreground/50" aria-hidden>
        ·
      </span>
      <span className="inline-flex items-center gap-0.5">
        <MessageCircle className="size-3 shrink-0 opacity-80" aria-hidden />
        {t("listingDetail.heroReplies", "الردود")}: {repliesCount}
      </span>
    </span>
  )

  return (
    <>
      <div dir={direction} className="border-b border-border px-4 py-3 sm:px-5">
        {title ? (
          <h1 className="text-lg font-bold leading-snug text-start text-foreground sm:text-xl">{title}</h1>
        ) : null}

        {(cityName || listingAgeTime) && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {cityName ? (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="size-3 shrink-0" aria-hidden />
                {cityName}
              </span>
            ) : null}
            {cityName && listingAgeTime ? (
              <span className="text-muted-foreground/50" aria-hidden>
                ·
              </span>
            ) : null}
            {listingAgeTime ? (
              <span
                className="inline-flex items-center gap-0.5 tabular-nums"
                title={t("listingDetail.listingAgeHint", "وقت نشر الإعلان وليس نشاط البائع")}
              >
                <Clock className="size-3 shrink-0" aria-hidden />
                {t("listingDetail.listingPublishedAgo", {
                  time: listingAgeTime,
                  defaultValue: "{{time}}",
                })}
              </span>
            ) : null}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="size-9 shrink-0">
              {seller.avatar_url ? (
                <AvatarImage src={resolveImageUrl(seller.avatar_url)} alt="" />
              ) : null}
              <AvatarFallback className="bg-primary text-sm text-primary-foreground">
                {displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <Link
                to={publicProfilePath(seller) ?? "/"}
                className="block truncate text-sm font-semibold text-primary hover:underline"
              >
                {displayName}
              </Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                {!isSelfSeller ? <AccountKindBadge user={seller} size="sm" /> : null}
                {isSelfSeller ? (
                  <span className="text-[11px] text-muted-foreground">
                    {t("listingDetail.youArePublisher", "أنت صاحب هذا العرض")}
                  </span>
                ) : null}
                {isVerified ? (
                  <Badge variant="outline" className="h-5 gap-0.5 border-primary px-1.5 py-0 text-[10px] text-primary">
                    <ShieldCheck className="size-3 shrink-0" aria-hidden />
                    {t("listingDetail.verified", "موثق")}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "mt-3 hidden flex-col gap-2 text-xs text-muted-foreground md:flex",
            "border-t border-border/60 pt-3"
          )}
        >
          <p>
            {t("listingDetail.completedOrders", "الطلبات المكتملة")}:{" "}
            <span className="tabular-nums text-foreground">{completedOrders}</span>
          </p>
          <span className="inline-flex flex-wrap items-center gap-1">
            <StarRating value={rating} readonly size="xs" showValue={totalRatings > 0} className="text-yellow-500" />
            {totalRatings > 0 ? (
              <span className="font-medium tabular-nums">
                {t("listingDetail.reviewCountParen", { count: totalRatings, defaultValue: "({{count}})" })}
              </span>
            ) : (
              <span className="font-medium tabular-nums">{t("listingDetail.reviewsEmptyParen", "(0 تقييمات)")}</span>
            )}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-t border-border/60 pt-3">
          <div className="flex min-w-0 flex-wrap items-end gap-x-4 gap-y-1">
            {showBidSide ? (
              <div>
                <span className="block text-[11px] text-muted-foreground">
                  {t("listingDetail.bidAmount", "وصل المبلغ ( السوم )")}
                </span>
                <span className="text-base font-bold text-primary tabular-nums sm:text-lg">
                  {currentBid != null ? formatPrice(currentBid) : "—"}
                </span>
              </div>
            ) : null}
            {hasPrice ? (
              <div>
                <span className="text-base font-bold tabular-nums text-foreground sm:text-lg">
                  {formatPrice(price)}
                </span>
                <span className="mt-0.5 hidden text-[11px] text-muted-foreground md:block">
                  {t("listingDetail.priceCaption", "(السعر)")}
                </span>
              </div>
            ) : null}
          </div>
          {statsInline}
        </div>
      </div>
      <Separator />
    </>
  )
}
