import { Link } from "react-router-dom"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { ProductImage } from "@/components/ui/ProductImage"
import { Eye, MapPin, MessageCircle, Clock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { formatDistanceToNow } from "date-fns"
import { ar, enUS } from "date-fns/locale"

/** Fixed row height — keep in sync with FeedSkeleton */
export const PRODUCT_CARD_ROW_HEIGHT = "h-[136px] sm:h-[140px]"

/** Wholesale list row — taller than homepage default */
export const WHOLESALE_LIST_ROW_HEIGHT = "min-h-[168px] sm:min-h-[188px]"

/** Default list thumb — full row height, fluid width on mobile */
export const PRODUCT_CARD_THUMB_CLASS =
  "h-full w-[clamp(5.5rem,32vw,8.75rem)] max-w-[38%] shrink-0 self-stretch sm:max-w-none sm:w-[140px] md:w-[160px]"

/** Wholesale list thumb */
export const WHOLESALE_LIST_THUMB_WIDTH =
  "h-full w-[clamp(6.25rem,34vw,10.5rem)] max-w-[42%] shrink-0 self-stretch sm:max-w-none sm:w-[11.5rem]"

const formatPrice = (price) => {
  if (price === null || price === undefined) return null
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Listing card — Haraj-style horizontal layout. Fixed height everywhere (feed + sidebar).
 */
export function ProductCard({
  product,
  compact,
  narrow,
  overlayAction = false,
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
  const hasPreMeta = Boolean(preMetaSlot)
  const formattedPrice = formatPrice(product.price)
  const showPrice = Boolean(priceSlot || formattedPrice != null)

  const publishedAt = product.published_at ? new Date(product.published_at) : null
  const timeAgo = publishedAt
    ? formatDistanceToNow(publishedAt, { addSuffix: true, locale })
    : "—"

  const imageCount = compact ? 0 : (product.media?.gallery?.length ?? (product.media?.image_url ? 1 : 0))

  const href =
    to ??
    (product?.is_wholesale ? `/wholesale/product/${product.id}` : `/products/${product.id}`)

  const textPad = cn(
    "px-3 py-3 sm:px-4 md:px-5",
    narrow && "px-2.5 sm:px-3"
  )

  const textColumn = (
    <div
      className={cn(
        "flex h-full min-w-0 flex-1 flex-col overflow-hidden text-start",
        textPad,
        compact ? "justify-center gap-1.5" : "justify-between gap-2"
      )}
    >
      {!compact ? (
        <div
          className={cn(
            "flex shrink-0 items-center justify-between gap-2",
            overlayAction && "pe-8"
          )}
        >
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted/60",
              isRequest && "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            )}
          >
            {isRequest ? t("feed.request") : t("feed.offer")}
          </span>
          {pillEndSlot ? (
            <div className="flex min-w-0 max-w-[50%] shrink flex-wrap items-center justify-end gap-1">
              {pillEndSlot}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col justify-center gap-1 overflow-hidden",
          compact && "flex-none justify-start"
        )}
      >
        <h3
          className={cn(
            "min-w-0 font-semibold leading-snug text-foreground hover:underline",
            compact
              ? "line-clamp-2 text-sm"
              : cn(
                  hasPreMeta || narrow ? "line-clamp-1" : "line-clamp-2",
                  narrow ? "text-sm sm:text-[15px]" : "text-sm sm:text-base md:text-[17px]"
                )
          )}
        >
          {product.title}
        </h3>

        {preMetaSlot ? (
          <div className="min-w-0 overflow-hidden [&_*]:truncate [&_p]:line-clamp-1">
            {preMetaSlot}
          </div>
        ) : null}

        {!compact ? (
          <div
            className={cn(
              "flex min-w-0 items-center gap-x-2 overflow-hidden text-muted-foreground",
              narrow ? "gap-x-1.5 text-[11px] sm:text-xs" : "text-[11px] sm:text-xs md:text-sm"
            )}
          >
            <span className="flex min-w-0 max-w-[40%] shrink items-center gap-1">
              <Avatar className="size-3.5 shrink-0 sm:size-4">
                <AvatarFallback className="bg-muted text-[9px] text-muted-foreground sm:text-[10px]">
                  {product.seller?.name?.charAt(0) ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{product.seller?.name ?? "—"}</span>
            </span>
            {product.location ? (
              <span className="hidden min-w-0 shrink items-center gap-1 sm:flex sm:max-w-[32%]">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{product.location}</span>
              </span>
            ) : null}
            <span className="flex min-w-0 flex-1 items-center justify-end gap-x-2 overflow-hidden">
              <span className="inline-flex shrink-0 items-center gap-1">
                <Clock className="size-3 shrink-0" />
                <span className="max-w-[5rem] truncate sm:max-w-[7rem]">{timeAgo}</span>
              </span>
              <span className="hidden shrink-0 items-center gap-1 sm:inline-flex">
                <MessageCircle className="size-3 shrink-0" />
                {product.stats?.messages ?? product.stats?.comments ?? 0}
              </span>
              <span className="hidden shrink-0 items-center gap-1 md:inline-flex">
                <Eye className="size-3 shrink-0" />
                {product.stats?.views ?? 0}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      {showPrice ? (
        <div className="shrink-0 overflow-hidden">
          {priceSlot ?? (
            <span
              className={cn(
                "block truncate font-medium tabular-nums leading-none text-foreground",
                narrow ? "text-sm sm:text-base" : "text-sm sm:text-base"
              )}
            >
              {formattedPrice}
            </span>
          )}
        </div>
      ) : null}
    </div>
  )

  const useCover = thumbnailCover || hasListingImage

  const imageColumn = (
    <div className={cn(thumbnailColumnClassName ?? PRODUCT_CARD_THUMB_CLASS)}>
      {isCompany ? (
        <div className="flex size-full items-center justify-center bg-primary/10 p-2 text-center text-sm font-bold leading-tight text-primary">
          {product.company?.name ?? t("feed.companyPlaceholder", "منفذ")}
        </div>
      ) : (
        <div
          className={cn(
            "relative size-full overflow-hidden",
            useCover ? "bg-muted/20 dark:bg-muted/10" : "bg-transparent"
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
                  useCover
                    ? "object-cover object-center"
                    : "object-contain object-center p-1 sm:p-1.5"
                )}
              />
              {!compact && imageCount > 1 ? (
                <span className="absolute end-1 top-1 rounded bg-background/80 px-1 text-[10px] text-muted-foreground">
                  {imageCount} {t("feed.images", "صور")}
                </span>
              ) : null}
            </>
          ) : (
            <ProductImage
              src={null}
              alt={product.title}
              categorySlug={product.category?.slug}
              className="size-full object-contain"
            />
          )}
        </div>
      )}
    </div>
  )

  const linkClass =
    "flex h-full min-h-0 min-w-0 flex-1 items-stretch overflow-hidden outline-none transition-colors hover:bg-muted/50"

  return (
    <article
      className={cn(
        "flex w-full min-w-0 items-stretch overflow-hidden border-b border-border bg-card transition-colors hover:bg-muted/50",
        articleClassName ?? PRODUCT_CARD_ROW_HEIGHT,
        trailingSlot && stackTrailingBelowOnNarrow && "max-sm:flex-col max-sm:min-h-0 sm:flex-row"
      )}
    >
      {trailingSlot ? (
        <>
          <Link
            to={href}
            className={cn(linkClass, stackTrailingBelowOnNarrow && "max-sm:h-[136px] sm:h-full")}
          >
            {imageColumn}
            {textColumn}
          </Link>
          <div
            className={cn(
              "flex min-w-0 shrink flex-col items-stretch justify-center gap-1.5 self-stretch border-border/60 px-2 py-3",
              stackTrailingBelowOnNarrow
                ? "max-sm:w-full max-sm:max-w-none max-sm:border-s-0 max-sm:border-t max-sm:px-3 sm:min-w-[7.5rem] sm:border-s sm:px-3 md:min-w-[8.5rem]"
                : "max-w-[38%] border-s px-2 sm:max-w-none sm:min-w-[7rem] sm:shrink-0 sm:px-3 md:min-w-[7.5rem]"
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
