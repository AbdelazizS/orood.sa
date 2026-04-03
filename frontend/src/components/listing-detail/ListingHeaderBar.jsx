import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { resolveImageUrl } from "@/lib/imageUrl"
import { timeAgo } from "@/lib/timeAgo"
import { MapPin, Eye, MessageCircle, Share2, Flag, CheckCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ShareModal } from "./ShareModal"

/**
 * Section 1 — Listing Header Bar.
 * RTL, bg-background, px-4 py-3. No card, no shadow.
 */
export function ListingHeaderBar({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const [showShareModal, setShowShareModal] = useState(false)
  const seller = product?.seller
  if (!seller) return null

  const cityName = product?.city?.name ?? seller.city?.name ?? product?.location ?? ""
  const lastSeen = seller.last_seen
  const isOnline = seller.is_online ?? false
  const completedOrders = seller.completed_orders ?? 0
  const rating = seller.rating ?? seller.reviews_avg ?? 0
  const isVerified = seller.is_verified ?? seller.email_verified
  const viewCount = product?.view_count ?? product?.stats?.views ?? 0
  const commentsCount = product?.stats?.comments ?? 0

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return ""
    return timeAgo(dateStr, t) + " " + (t("listingDetail.lastSeen", "آخر ظهور") ?? "آخر ظهور")
  }

  return (
    <>
      <div
        dir={direction}
        className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Avatar className="size-9 shrink-0">
            {seller.avatar_url ? (
              <AvatarImage src={resolveImageUrl(seller.avatar_url)} alt="" />
            ) : null}
            <AvatarFallback className="bg-primary text-sm text-primary-foreground">
              {seller.name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Link
              to={seller.username ? `/profile/${seller.username}` : "/"}
              className="text-sm font-semibold text-foreground hover:underline"
            >
              {seller.name}
            </Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              {cityName && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <MapPin className="size-[11px]" />
                  {cityName}
                </span>
              )}
              {isOnline ? (
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-primary" />
                  <span className="text-xs text-primary">
                    {t("listingDetail.onlineNow", "متصل الآن")}
                  </span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(lastSeen)}
                </span>
              )}
              {isVerified && (
                <Badge
                  variant="outline"
                  className="gap-1 border-primary py-0 text-xs text-primary"
                >
                  <CheckCircle className="size-[10px]" />
                  {t("listingDetail.verified", "موثق")}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {t("listingDetail.completedOrders", "الطلبات المكتملة")}: {completedOrders}
              </span>
              {rating > 0 && (
                <span className="flex gap-0.5 text-xs text-yellow-500">
                  {"★".repeat(Math.round(rating))}
                  {"☆".repeat(5 - Math.round(rating))}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="size-[13px]" />
            {viewCount}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageCircle className="size-[13px]" />
            {commentsCount}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setShowShareModal(true)}
                  aria-label={t("common.share", "مشاركة")}
                >
                  <Share2 className="size-[14px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t("common.share", "مشاركة")}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive"
                  onClick={() => {}}
                  aria-label={t("common.report", "إبلاغ")}
                >
                  <Flag className="size-[14px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t("common.report", "إبلاغ")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <Separator />
      <ShareModal open={showShareModal} onOpenChange={setShowShareModal} product={product} />
    </>
  )
}
