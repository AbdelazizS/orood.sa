import { Link } from "react-router-dom"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/imageUrl"
import { Eye, MapPin, MessageCircle, Package, Clock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { formatDistanceToNow } from "date-fns"
import { ar, enUS } from "date-fns/locale"

/** Canonical row height — keep in sync with FeedSkeleton */
export const PRODUCT_CARD_ROW_HEIGHT = "h-[136px] sm:h-[140px]"

const formatPrice = (price, t) => {
  if (price === null || price === undefined) return t("feed.priceOnRequest")
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Listing card — Haraj-style horizontal layout. Fixed height everywhere (feed + sidebar).
 * compact: same design, less data (title + price only, no seller/location/stats).
 * narrow: denser type/padding for narrow columns (e.g. similar products); same fixed height.
 */
export function ProductCard({ product, compact, narrow }) {
  const { t, i18n } = useTranslation()
  const isRequest = product.type === "request"
  const hasListingImage = Boolean(product.media?.image_url)
  const companyBranding = product.company && typeof product.company === "object" ? product.company : null
  const wantsCompanyTile = Boolean(companyBranding?.name || product.seller?.is_company)
  const isCompany = wantsCompanyTile && !hasListingImage
  const locale = i18n.language === "ar" ? ar : enUS

  const publishedAt = product.published_at ? new Date(product.published_at) : null
  const timeAgo = publishedAt
    ? formatDistanceToNow(publishedAt, { addSuffix: true, locale })
    : "—"

  const imageCount = compact ? 0 : (product.media?.gallery?.length ?? (product.media?.image_url ? 1 : 0))

  return (
    <Link to={`/products/${product.id}`}>
      <article
        className={cn(
          "flex items-stretch gap-0 overflow-hidden border-b border-border bg-card",
          "hover:bg-muted/50 transition-colors",
          PRODUCT_CARD_ROW_HEIGHT
        )}
      >
        {/* Image side — fixed size */}
        <div className="h-full w-[140px] shrink-0 sm:w-[160px]">
          {isCompany ? (
            <div className="flex items-center justify-center size-full bg-primary/10 text-primary font-bold text-sm text-center leading-tight p-2 rounded-none">
              {product.company?.name ?? t("feed.companyPlaceholder", "منفذ")}
            </div>
          ) : (
            <div className="relative size-full overflow-hidden bg-transparent">
              {product.media?.image_url ? (
                <>
                  <img
                    src={resolveImageUrl(product.media.image_url)}
                    alt={product.title}
                    className="size-full object-contain p-1 sm:p-1.5"
                    loading="lazy"
                  />
                  {!compact && imageCount > 1 && (
                    <span className="absolute top-1 end-1 text-[10px] text-muted-foreground/90 bg-background/70 px-1 rounded">
                      {imageCount} {t("feed.images", "صور")}
                    </span>
                  )}
                </>
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <Package className="size-10" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Text side */}
        <div
          className={cn(
            "flex h-full min-w-0 flex-1 flex-col justify-between py-3 text-start sm:px-5",
            narrow ? "px-3" : "px-4"
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-1">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <span
                className={cn(
                  "font-medium px-1.5 py-0.5 rounded shrink-0 text-muted-foreground bg-muted/60",
                  narrow ? "text-[10px]" : "text-[11px]",
                  isRequest && "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                )}
              >
                {isRequest ? t("feed.request") : t("feed.offer")}
              </span>
            </div>
            <h3
              className={cn(
                "min-h-0 shrink font-semibold leading-snug text-foreground hover:underline line-clamp-2",
                compact ? "text-sm" : narrow ? "text-sm sm:text-[15px]" : "text-base sm:text-[17px]"
              )}
            >
              {product.title}
            </h3>
            {!compact && (
              <div
                className={cn(
                  "mt-auto flex min-h-0 min-w-0 items-center overflow-hidden text-muted-foreground whitespace-nowrap",
                  narrow ? "gap-x-2 text-[11px] sm:text-xs" : "gap-x-3 text-sm"
                )}
              >
                <span className="flex min-w-0 shrink items-center gap-1">
                  <Avatar className="size-4 shrink-0">
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                      {product.seller?.name?.charAt(0) ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{product.seller?.name ?? "—"}</span>
                </span>
                {product.location && (
                  <span className="flex min-w-0 shrink items-center gap-1">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{product.location}</span>
                  </span>
                )}
                <span className="flex shrink-0 items-center gap-1">
                  <Clock className="size-3 shrink-0" />
                  <span className={narrow ? "max-w-[5.5rem] truncate sm:max-w-[7rem]" : ""}>{timeAgo}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <MessageCircle className="size-3 shrink-0" />
                  {product.stats?.messages ?? product.stats?.comments ?? 0}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Eye className="size-3 shrink-0" />
                  {product.stats?.views ?? 0}
                </span>
              </div>
            )}
          </div>
          <div className="mt-1 flex shrink-0 items-center justify-between gap-2">
            <span className={cn("font-medium text-foreground", narrow ? "text-sm sm:text-base" : "text-base")}>
              {formatPrice(product.price, t)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
