import { Link } from "react-router-dom"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/imageUrl"
import { Eye, MapPin, MessageCircle, Package, Clock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { formatDistanceToNow } from "date-fns"
import { ar, enUS } from "date-fns/locale"

const formatPrice = (price, t) => {
  if (price === null || price === undefined) return t("feed.priceOnRequest")
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

/**
 * Listing card — Haraj-style horizontal layout. Fixed height, modern.
 * compact: same design, less data (title + price only, no seller/location/stats).
 */
export function ProductCard({ product, compact }) {
  const { t, i18n } = useTranslation()
  const isRequest = product.type === "request"
  const isCompany = product.company ?? product.seller?.is_company
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
          "flex items-stretch gap-0 border-b border-border bg-card h-[120px]",
          "hover:bg-muted/50 transition-colors"
        )}
      >
        {/* Image side — fixed size */}
        <div className={cn("shrink-0 w-[140px] sm:w-[160px] h-[120px]")}>
          {isCompany ? (
            <div className="flex items-center justify-center size-full bg-primary/10 text-primary font-bold text-sm text-center leading-tight p-2 rounded-none">
              {product.company?.name ?? t("feed.companyPlaceholder", "منفذ")}
            </div>
          ) : (
            <div className="relative size-full overflow-hidden bg-muted">
              {product.media?.image_url ? (
                <>
                  <img
                    src={resolveImageUrl(product.media.image_url)}
                    alt={product.title}
                    className="size-full object-cover"
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

        {/* Text side — image one side, content other. Offer badge light, top. */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-3 px-4 sm:px-5 text-start">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0 text-muted-foreground bg-muted/60",
                  isRequest && "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                )}
              >
                {isRequest ? t("feed.request") : t("feed.offer")}
              </span>
            </div>
            <h3 className={cn(
              "font-semibold hover:underline line-clamp-2 text-foreground",
              compact ? "text-sm" : "text-[15px]"
            )}>
              {product.title}
            </h3>
            {!compact && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Avatar className="size-4">
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                      {product.seller?.name?.charAt(0) ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span>{product.seller?.name ?? "—"}</span>
                </span>
                {product.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {product.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {timeAgo}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="size-3" />
                  {product.stats?.messages ?? product.stats?.comments ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="size-3" />
                  {product.stats?.views ?? 0}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
            <span className="font-medium text-sm text-foreground">
              {formatPrice(product.price, t)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
