import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StarRating } from "@/components/ui/StarRating"
import { resolveImageUrl } from "@/lib/imageUrl"
import { timeAgo } from "@/lib/timeAgo"
import { getSellerPresenceUi } from "@/lib/sellerPresence"
import { publicProfilePath } from "@/lib/profileRoutes"
import { useAuthStore } from "@/store/useAuthStore"
import { MapPin, ShieldCheck, Eye, MessageCircle, Clock } from "lucide-react"

/**
 * PDF Section 1+2 — two columns under back button: seller identity (visual RTL right) |
 * price, السوم, views, replies (visual RTL left). No share/report here.
 * Listing age uses `published_at` then `created_at` (see ProductResource / marketplace-foundation.md).
 */
export function ListingDetailHeroSection({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const { user, token } = useAuthStore()
  const seller = product?.seller
  if (!seller) return null

  const isOwner = Boolean(token && (user?.id === seller?.id || user?.id === product?.user_id))
  const isSelfSeller = Boolean(token && user?.id === seller?.id)
  const stats = product?.stats ?? {}
  const viewCount = product?.view_count ?? stats.views ?? stats.view_count ?? 0
  const repliesCount = stats.comments ?? 0

  const cityName = product?.city?.name ?? seller.city?.name ?? product?.location ?? ""
  const presence = getSellerPresenceUi(seller, t, { isSelfSeller })
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

  return (
    <>
      <div
        dir={direction}
        className="grid grid-cols-1 gap-4 border-b border-border px-4 py-3 md:grid-cols-2 md:items-start"
      >
        {/* DOM first — appears on visual RIGHT in RTL (seller identity) */}
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

          <p className="text-xs text-muted-foreground">
            {t("listingDetail.completedOrders", "الطلبات المكتملة")}:{" "}
            <span className="tabular-nums text-foreground">{completedOrders}</span>
          </p>

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

        {/* DOM second — visual LEFT in RTL (listing stats) */}
        <div className="flex min-w-0 flex-col gap-3 text-start">
          <div>
            {hasPrice ? (
              <span className="block text-xl font-bold tabular-nums text-foreground">{formatPrice(price)}</span>
            ) : (
              <span className="block text-xl font-bold text-muted-foreground">
                {t("listingDetail.priceNotSet", "السعر غير محدد")}
              </span>
            )}
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {t("listingDetail.priceCaption", "(السعر)")}
            </span>
          </div>

          {showBidSide ? (
            <div>
              <span className="block text-xs text-muted-foreground">
                {t("listingDetail.bidAmount", "وصل المبلغ ( السوم )")}
              </span>
              <span className="mt-0.5 block text-xl font-bold text-primary tabular-nums">
                {currentBid != null ? formatPrice(currentBid) : "—"}
              </span>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <span>
                {t("listingDetail.heroViews", "المشاهدات")}: {viewCount}
              </span>
              <Eye className="size-3.5 shrink-0 opacity-80" aria-hidden />
            </span>
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <span>
                {t("listingDetail.heroReplies", "الردود")}: {repliesCount}
              </span>
              <MessageCircle className="size-3.5 shrink-0 opacity-80" aria-hidden />
            </span>
          </div>
        </div>
      </div>
      <Separator />
    </>
  )
}
