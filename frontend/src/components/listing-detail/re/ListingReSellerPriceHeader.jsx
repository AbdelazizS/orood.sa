import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/ui/StarRating"
import { resolveImageUrl } from "@/lib/imageUrl"
import { getSellerPresenceUi } from "@/lib/sellerPresence"
import { timeAgo } from "@/lib/timeAgo"
import { publicProfilePath } from "@/lib/profileRoutes"
import { useAuthStore } from "@/store/useAuthStore"
import { AccountKindBadge } from "@/components/profile/AccountKindBadge"
import { MapPin, Eye, MessageCircle } from "lucide-react"

export function ListingReSellerPriceHeader({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const { user, token } = useAuthStore()
  const seller = product?.seller
  if (!seller) return null

  const isSelfSeller = Boolean(token && user?.id === seller?.id)
  const stats = product?.stats ?? {}
  const viewCount = product?.view_count ?? stats.views ?? 0
  const repliesCount = stats.comments ?? 0
  const cityName = product?.city?.name ?? seller.city?.name ?? product?.location ?? ""
  const presence = getSellerPresenceUi(seller, t, { isSelfSeller })
  const displayName = seller.username?.trim() || seller.name?.trim() || "?"
  const memberSince = seller.created_at ? timeAgo(seller.created_at, t) : ""

  const formatPrice = (val) => {
    if (val == null || val === "") return "—"
    const n = Number(val)
    if (Number.isNaN(n)) return "—"
    return `${Math.round(n).toLocaleString("ar-SA")} ${t("common.currency", "ر.س")}`
  }

  const price = product?.price
  const hasPrice = price != null && Number(price) > 0

  return (
    <div dir={direction} className="border-b border-border bg-card px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-end gap-1 text-end">
          <Avatar className="size-11 shrink-0 bg-green-600">
            {seller.avatar_url ? (
              <AvatarImage src={resolveImageUrl(seller.avatar_url)} alt="" />
            ) : null}
            <AvatarFallback className="bg-green-600 text-base font-semibold text-white">
              {displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <Link
              to={publicProfilePath(seller) ?? "/"}
              className="truncate text-sm font-semibold text-foreground hover:text-primary hover:underline"
            >
              {displayName}
            </Link>
            {!isSelfSeller ? <AccountKindBadge user={seller} size="sm" /> : null}
          </div>
          {cityName ? (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" aria-hidden />
              {cityName}
            </span>
          ) : null}
          {!isSelfSeller && presence.showOfflineBadge ? (
            <Badge variant="secondary" className="h-5 px-2 text-[10px] font-normal">
              {t("listingDetail.offline", "غير متصل")}
            </Badge>
          ) : null}
          {!isSelfSeller && presence.showOnline ? (
            <span className="text-[11px] text-green-600">{t("listingDetail.onlineNow", "متصل الآن")}</span>
          ) : null}
          <p className="text-[11px] text-muted-foreground">
            {t("listingDetail.completedOrders", "الطلبات المكتملة")}:{" "}
            <span className="tabular-nums text-foreground">{seller.completed_orders ?? 0}</span>
          </p>
          {!isSelfSeller && presence.lastSeenParagraph ? (
            <p className="text-[11px] text-muted-foreground">{presence.lastSeenParagraph}</p>
          ) : null}
          {memberSince ? (
            <p className="text-[11px] text-muted-foreground">
              {t("listingDetail.re.memberSince", { time: memberSince, defaultValue: "عضو منذ {{time}}" })}
            </p>
          ) : null}
          <span className="inline-flex flex-wrap items-center justify-end gap-1 pt-0.5">
            <StarRating
              value={Number(seller.rating ?? 0)}
              readonly
              size="xs"
              className="text-yellow-500"
            />
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {Number(seller.total_ratings ?? 0) > 0
                ? t("listingDetail.reviewCountParen", { count: seller.total_ratings })
                : t("listingDetail.reviewsEmptyParen", "(0 تقييمات)")}
            </span>
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-1 text-start">
          {hasPrice ? (
            <>
              <span className="text-xl font-bold tabular-nums text-foreground sm:text-2xl">
                {formatPrice(price)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {t("listingDetail.priceCaption", "(السعر)")}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">{t("listingDetail.priceNotSet")}</span>
          )}
          <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Eye className="size-3 shrink-0" aria-hidden />
              {t("listingDetail.heroViews", "المشاهدات")}: {viewCount}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <MessageCircle className="size-3 shrink-0" aria-hidden />
              {t("listingDetail.heroReplies", "الردود")}: {repliesCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

