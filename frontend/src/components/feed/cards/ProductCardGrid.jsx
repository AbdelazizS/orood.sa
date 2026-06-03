import { Link, useLocation } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { MapPin, ShoppingBag } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { ProductImage } from "@/components/ui/ProductImage"

const formatPrice = (price) => {
  if (price === null || price === undefined) return null
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * ProductCardGrid — compact vertical card for grid layouts.
 */
export function ProductCardGrid({ product, className }) {
  const { t } = useTranslation()
  const location = useLocation()
  const from = `${location.pathname}${location.search}`
  const detailTo = product?.is_wholesale
    ? `/wholesale/product/${product.id}`
    : `/products/${product.id}`
  const isUsed = product?.condition === "used"
  const isRequest = product?.type === "request"
  const imageUrl = product?.media?.image_url ?? product?.media?.gallery?.[0]
  const formattedPrice = formatPrice(product?.price)

  return (
    <Link to={detailTo} className="block h-full min-w-0" state={{ from }}>
      <Card
        className={cn(
          "group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200",
          "hover:scale-[1.02] hover:shadow-md",
          "focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-2",
          className
        )}
      >
        <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-muted/20">
          <ProductImage
            src={imageUrl}
            alt={product?.title ?? ""}
            categorySlug={product?.category?.slug}
            className="size-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <div className="absolute start-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
            <Badge
              className={cn(
                "border-0 text-xs font-medium shadow-sm",
                isRequest ? "bg-blue-600 text-white" : "bg-primary text-primary-foreground"
              )}
            >
              {isRequest ? t("feed.request") : t("feed.offer")}
            </Badge>
            {!isRequest ? (
              <Badge
                variant="secondary"
                className={cn(
                  "border-0 text-xs font-medium",
                  isUsed ? "bg-muted-foreground/80" : "bg-blue-600/90 text-white"
                )}
              >
                {isUsed ? t("feed.used") : t("feed.new")}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <h3 className="line-clamp-2 min-h-0 text-sm font-semibold leading-snug">
            {product?.title}
          </h3>

          {formattedPrice != null ? (
            <p className="flex min-w-0 items-center gap-1.5 truncate text-base font-bold text-primary">
              <ShoppingBag className="size-4 shrink-0" />
              <span className="truncate">{formattedPrice}</span>
            </p>
          ) : null}

          {product?.location ? (
            <p className="mt-auto flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{product.location}</span>
            </p>
          ) : null}
        </div>
      </Card>
    </Link>
  )
}
