import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { resolveImageUrl } from "@/lib/imageUrl"
import { MapPin, Star, Share2, Flag } from "lucide-react"
import { ShareModal } from "./ShareModal"

/**
 * Section 1: User avatar (36px), username link, location, online status,
 * verified badge, completed orders, star rating. Share and Report on left.
 */
export function ListingTopBar({ product }) {
  const { t } = useTranslation()
  const [shareOpen, setShareOpen] = useState(false)
  const seller = product?.seller
  if (!seller) return null

  const cityName = product?.city?.name ?? seller.city?.name ?? product?.location ?? ""
  const lastSeen = seller.last_seen ?? t("productDetails.onlineNow", "متصل الآن")
  const isOnline = lastSeen === "Online" || lastSeen?.includes("الآن")
  const completedOrders = seller.completed_orders ?? 0
  const rating = seller.reviews_avg ?? 0
  const isVerified = seller.is_verified ?? seller.email_verified

  return (
    <>
      <div
        className="flex items-center justify-between gap-4 border-b border-border bg-card px-6 py-3"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar className="size-9 shrink-0">
            {seller.avatar_url ? (
              <img src={resolveImageUrl(seller.avatar_url)} alt="" className="size-full object-cover" />
            ) : null}
            <AvatarFallback className="text-sm bg-primary/20 text-primary">
              {seller.name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Link to={seller.username ? `/profile/${seller.username}` : "/"} className="font-bold text-[14px] text-foreground hover:underline truncate block">
              {seller.name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
              {cityName && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {cityName}
                </span>
              )}
              <span className={isOnline ? "text-primary" : ""}>
                {isOnline ? "● " : ""}{lastSeen}
              </span>
              {isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  ✓ {t("listingDetail.verified", "موثق")}
                </span>
              )}
              <span className="text-[12px]">
                {t("listingDetail.completedOrders", "الطلبات المكتملة")}: {completedOrders}
              </span>
              {rating > 0 && (
                <span className="flex items-center gap-1 text-[14px]">
                  {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="size-4" />
            {t("share.title", "مشاركة")}
          </Button>
          <Button variant="outline" size="sm" className="text-destructive">
            <Flag className="size-4" />
            {t("common.report", "بلاغ")}
          </Button>
        </div>
      </div>
      <ShareModal open={shareOpen} onOpenChange={setShareOpen} product={product} />
    </>
  )
}
