import { Link } from "react-router-dom"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { ProductImage } from "@/components/ui/ProductImage"
import { Eye, MapPin, MessageCircle, Package, Clock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { formatDistanceToNow } from "date-fns"
import { ar, enUS } from "date-fns/locale"

/** Canonical row height â€” keep in sync with FeedSkeleton */
export const PRODUCT_CARD_ROW_HEIGHT = "h-[136px] sm:h-[140px]"

/** Wholesale list row â€” taller than homepage default so progress + dual price + qty stepper fit */
export const WHOLESALE_LIST_ROW_HEIGHT = "min-h-[168px] sm:min-h-[188px]"

/** Wholesale list thumb â€” fluid on narrow screens, fixed from `sm` up (avoids horizontal overflow) */
export const WHOLESALE_LIST_THUMB_WIDTH =
  "w-[clamp(6.25rem,34vw,10.5rem)] max-w-[42%] shrink-0 sm:max-w-none sm:w-[11.5rem]"

const formatPrice = (price, t) => {
  if (price === null || price === undefined) return t("feed.priceOnRequest")
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Listing card â€” Haraj-style horizontal layout. Fixed height everywhere (feed + sidebar).
 * compact: same design, less data (title + price only, no seller/location/stats).
 * narrow: denser type/padding for narrow columns (e.g. similar products); same fixed height.
 *
 * Optional slots (wholesale / extensions): `to`, `pillEndSlot`, `preMetaSlot`, `priceSlot`, `trailingSlot`, `articleClassName`.
 * `thumbnailCover` â€” fill the fixed-width thumb strip (object-cover, no inner padding); matches wholesale grid tiles when list rows grow taller than the default row height.
 * `thumbnailColumnClassName` â€” override thumb column width (e.g. wholesale `WHOLESALE_LIST_THUMB_WIDTH`).
 * `stackTrailingBelowOnNarrow` â€” when `trailingSlot` is set, stack CTA full-width under the row on small screens (wholesale list).
 */
export function ProductCard({
  product,
  compact,
  narrow,
  to,
  pillEndSlot = null,
  preMetaSlot = null,
  priceSlot = null,
  trailingSlot = null,
  articleClassName,
  thumbnailCover = false,
  thumbnailColumnClassName,
  stackTrailingBelowOnNarrow = false,
}) {
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
    : "â€”"

  const imageCount = compact ? 0 : (product.media?.gallery?.length ?? (product.media?.image_url ? 1 : 0))

  const href =
    to ??
    (product?.is_wholesale ? `/wholesale/product/${product.id}` : `/products/${product.id}`)

  const textColumn = (
    <div
      className={cn(
        "flex h-full min-w-0 flex-1 flex-col justify-between py-3 text-start",
        narrow ? "px-3" : "px-4 sm:px-5"
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <span
            className={cn(
              "font-medium px-1.5 py-0.5 rounded shrink-0 text-muted-foreground bg-muted/60",
              narrow ? "text-[10px]" : "text-[11px]",
              isRequest && "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            )}
          >
            {isRequest ? t("feed.request") : t("feed.offer")}
          </span>
          {pillEndSlot ? <div className="flex min-w-0 shrink flex-wrap items-center justify-end gap-1.5">{pillEndSlot}</div> : null}
        </div>
        <h3
          className={cn(
            "min-h-0 shrink font-semibold leading-snug text-foreground hover:underline line-clamp-2",
            compact ? "text-sm" : narrow ? "text-sm sm:text-[15px]" : "text-base sm:text-[17px]"
          )}
        >
          {product.title}
        </h3>
        {preMetaSlot ? <div className="min-h-0 shrink">{preMetaSlot}</div> : null}
        {!compact && (
          <div
            className={cn(
              "mt-auto flex min-h-0 min-w-0 flex-wrap items-center gap-x-3 gap-y-1 overflow-visible text-muted-foreground sm:flex-nowrap sm:gap-y-0 sm:overflow-hidden sm:whitespace-nowrap",
              narrow ? "gap-x-2 text-[11px] sm:text-xs" : "text-sm"
            )}
          >
            <span className="flex min-w-0 shrink items-center gap-1">
              <Avatar className="size-4 shrink-0">
                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                  {product.seller?.name?.charAt(0) ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{product.seller?.name ?? "â€”"}</span>
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
      <div className="mt-1 flex shrink-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          {priceSlot ?? (
            <span className={cn("font-medium text-foreground", narrow ? "text-sm sm:text-base" : "text-base")}>
              {formatPrice(product.price, t)}
            </span>
          )}
        </div>
      </div>
    </div>
  )

  const imageColumn = (
    <div className={cn("h-full shrink-0", thumbnailColumnClassName ?? "w-[140px] sm:w-[160px]")}>
      {isCompany ? (
        <div className="flex items-center justify-center size-full bg-primary/10 text-primary font-bold text-sm text-center leading-tight p-2 rounded-none">
          {product.company?.name ?? t("feed.companyPlaceholder", "Ù…Ù†ÙØ°")}
        </div>
      ) : (
        <div
          className={cn(
            "relative size-full overflow-hidden",
            thumbnailCover ? "bg-muted/25 dark:bg-muted/15" : "bg-transparent"
          )}
        >
          {product.media?.image_url ? (
            <>
              <ProductImage
                src={product.media.image_url}
                alt={product.title}
                categorySlug={product.category?.slug}
                className={cn(
                  "size-full",
                  thumbnailCover
                    ? "object-cover object-center p-0"
                    : "object-contain p-1 sm:p-1.5"
                )}
              />
              {!compact && imageCount > 1 && (
                <span className="absolute top-1 end-1 text-[10px] text-muted-foreground/90 bg-background/70 px-1 rounded">
                  {imageCount} {t("feed.images", "ØµÙˆØ±")}
                </span>
              )}
            </>
          ) : (
            <ProductImage
              src={null}
              alt={product.title}
              categorySlug={product.category?.slug}
              className="size-full"
            />
          )}
        </div>
      )}
    </div>
  )

  const linkClass = "flex min-h-0 min-w-0 flex-1 items-stretch gap-0 overflow-hidden outline-none transition-colors hover:bg-muted/50"

  return (
    <article
      className={cn(
        "flex w-full min-w-0 items-stretch gap-0 overflow-hidden border-b border-border bg-card transition-colors hover:bg-muted/50",
        articleClassName ?? PRODUCT_CARD_ROW_HEIGHT,
        trailingSlot && stackTrailingBelowOnNarrow && "max-sm:flex-col max-sm:min-h-0 sm:flex-row"
      )}
    >
      {trailingSlot ? (
        <>
          <Link to={href} className={cn(linkClass, stackTrailingBelowOnNarrow && "max-sm:min-h-[140px]")}>
            {imageColumn}
            {textColumn}
          </Link>
          <div
            className={cn(
              "flex min-w-0 shrink flex-col items-stretch justify-center gap-1.5 border-border/60 px-2 py-2",
              stackTrailingBelowOnNarrow
                ? "max-sm:w-full max-sm:max-w-none max-sm:border-s-0 max-sm:border-t max-sm:px-3 max-sm:py-3 sm:max-w-none sm:min-w-[7.5rem] sm:border-s sm:px-3 md:min-w-[8.5rem]"
                : "max-w-[38%] border-s px-1.5 sm:max-w-none sm:min-w-[7rem] sm:shrink-0 sm:px-3 md:min-w-[7.5rem]"
            )}
          >
            {trailingSlot}
          </div>
        </>
      ) : (
        <Link to={href} className={cn(linkClass, "flex-1")}>
          {imageColumn}
          {textColumn}
        </Link>
      )}
    </article>
  )
}
