import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/imageUrl"
import {
  BadgeCheck,
  Eye,
  MapPin,
  MessageCircle,
  Package,
  ShoppingBag,
} from "lucide-react"
import { useTranslation } from "react-i18next"

const formatPrice = (price, t) => {
  if (price === null || price === undefined) return t("feed.priceOnRequest")
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * ProductCard — enterprise-grade listing card following big-company standards.
 * Uses shadcn primitives (Card, Badge, Button) with clear hierarchy,
 * micro-interactions, and RTL-aware layout.
 */
export function ProductCard({ product }) {
  const { t } = useTranslation()
  const isUsed = product.condition === "used"
  const isRequest = product.type === "request"
  const warranty = product.warranty ?? product.warranty_period

  return (
    <Link to={`/products/${product.id}`}>
    <Card
      className={cn(
        "py-0 group overflow-hidden border-0 bg-card shadow-sm transition-all duration-300",
        "hover:shadow-lg hover:ring-2 hover:ring-primary/10",
        "focus-within:ring-2 focus-within:ring-primary/20",
      )}
    >
      <article className="flex flex-col md:flex-row">
        {/* Image block — fixed aspect, hover zoom */}
        <div className="relative shrink-0 overflow-hidden bg-muted/50 md:w-72 lg:w-80">
          <div className="aspect-[4/3] w-full md:aspect-square md:h-full md:min-h-[200px]">
            {product.media?.image_url ? (
              <img
                src={resolveImageUrl(product.media.image_url)}
                alt={product.title}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                <Package className="size-12 opacity-40" />
              </div>
            )}
          </div>
          {/* Overlay badges — top start */}
          <div className="absolute start-2 top-2 flex flex-wrap gap-1.5">
            <Badge
              variant={isRequest ? "secondary" : "default"}
              className={cn(
                "gap-1 border-0 text-xs font-medium shadow-sm",
                isRequest
                  ? "bg-amber-500/90 text-amber-950"
                  : "bg-primary/95 text-primary-foreground",
              )}
            >
              {isRequest ? t("feed.request") : t("feed.offer")}
            </Badge>
            <Badge
              className={cn(
                "gap-1 border-0 text-xs font-medium shadow-sm",
                isUsed ? "bg-muted-foreground/80 text-muted" : "bg-blue-600/95 text-blue-50",
              )}
            >
              <BadgeCheck className="size-3.5" />
              {isUsed ? t("feed.used") : t("feed.new")}
            </Badge>
            {warranty && (
              <Badge
                variant="secondary"
                className="gap-1 border-0 bg-background/90 text-xs font-medium shadow-sm"
              >
                <ShoppingBag className="size-3.5" />
                {t("feed.warranty", { period: warranty })}
              </Badge>
            )}
          </div>
        </div>

        {/* Content block */}
        <div className="flex flex-1 flex-col">
          <CardContent className="flex flex-1 flex-col gap-4 p-4  md:py-5">
            <div className="space-y-4">
              <div>
                <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-foreground">
                  {product.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {product.description}
                </p>
              </div>

              {/* Price + location */}
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-2 text-xl font-bold text-primary">
                  <ShoppingBag className="size-5 shrink-0" />
                  {formatPrice(product.price, t)}
                </span>
                {product.location && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-4 shrink-0" />
                    {product.location}
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5" title={t("feed.views")}>
                  <Eye className="size-3.5" />
                  {product.stats?.views ?? 0}
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="size-3.5" />
                  {product.stats?.messages ?? 0}
                </span>
                <span className="flex items-center gap-1.5">
                  <Package className="size-3.5" />
                  {product.stats?.purchases ?? 0}
                </span>
              </div>
            </div>
          </CardContent>

          {/* Seller + CTA */}
          <CardFooter className="flex items-center justify-between gap-4 border-t bg-muted/30 px-4 py-3 md:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar className="size-9 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {product.seller?.name?.charAt(0)?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {product.seller?.name ?? "—"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {product.seller?.last_seen} • {product.seller?.completed_orders ?? 0}{" "}
                  {t("feed.orders")}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0 rounded-full px-4 font-semibold"
            >
              {t("feed.contactNow")}
            </Button>
          </CardFooter>
        </div>
      </article>
    </Card>
    </Link>
  )
}
