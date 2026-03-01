import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { MapPin, Package, ShoppingBag } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/imageUrl"

const formatPrice = (price, t) => {
  if (price === null || price === undefined) return t("feed.priceOnRequest")
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * ProductCardGrid — compact vertical card for grid layouts (similar products, etc).
 * Image on top, title, price, location. Hover: scale + shadow.
 */
export function ProductCardGrid({ product, className }) {
  const { t } = useTranslation()
  const isUsed = product?.condition === "used"
  const isRequest = product?.type === "request"
  const imageUrl = product?.media?.image_url ?? product?.media?.gallery?.[0]

  return (
    <Link to={`/products/${product.id}`} className="block">
      <Card
        className={cn(
          "group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200",
          "hover:scale-[1.02] hover:shadow-md",
          "focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-2",
          className
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted/50">
          {imageUrl ? (
            <img
              src={resolveImageUrl(imageUrl)}
              alt={product?.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
              <Package className="size-12 opacity-40" />
            </div>
          )}
          <div className="absolute start-2 top-2 flex flex-wrap gap-1">
            <Badge
              className={cn(
                "border-0 text-xs font-medium shadow-sm",
                isRequest ? "bg-blue-600 text-white" : "bg-primary text-primary-foreground"
              )}
            >
              {isRequest ? t("feed.request") : t("feed.offer")}
            </Badge>
            {!isRequest && (
              <Badge
                variant="secondary"
                className={cn(
                  "border-0 text-xs font-medium",
                  isUsed ? "bg-muted-foreground/80" : "bg-blue-600/90 text-white"
                )}
              >
                {isUsed ? t("feed.used") : t("feed.new")}
              </Badge>
            )}
          </div>
        </div>
        <div className="space-y-2 p-3">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
            {product?.title}
          </h3>
          <p className="flex items-center gap-1.5 text-base font-bold text-primary">
            <ShoppingBag className="size-4 shrink-0" />
            {formatPrice(product?.price, t)}
          </p>
          {product?.location && (
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              {product.location}
            </p>
          )}
        </div>
      </Card>
    </Link>
  )
}
