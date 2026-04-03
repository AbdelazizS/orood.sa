import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MapPin, Package, MessageSquare, Eye, ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/imageUrl"
import { VerificationBadge } from "@/components/auth/VerificationBadge"
import { ContactDialog } from "@/components/chat/ContactDialog"

const formatPrice = (price, t) => {
  if (price == null || price === undefined) return t("feed.priceOnRequest")
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * RelatedProductCard — for similar products section.
 * Image, title, price or "اسأل السعر", location, seller badge, stats, CTA buttons.
 */
export function RelatedProductCard({ product, className }) {
  const { t } = useTranslation()
  const isUsed = product?.condition === "used"
  const isRequest = product?.type === "request"
  const imageUrl = product?.media?.image_url ?? product?.media?.gallery?.[0]
  const views = product?.stats?.views ?? 0
  const comments = product?.stats?.comments ?? 0
  const level = product?.seller?.verification_level === "company_verified" ? "blue"
    : product?.seller?.verification_level === "id_verified" ? "gold"
    : product?.seller?.email_verified ? "green" : "grey"

  return (
    <Card
      className={cn(
        "group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200",
        "hover:scale-[1.02] hover:shadow-md",
        "focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-2",
        className
      )}
    >
      <Link to={`/products/${product.id}`} className="block">
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
      </Link>
      <div className="space-y-2 p-3">
        <Link to={`/products/${product.id}`}>
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight hover:underline">
            {product?.title}
          </h3>
        </Link>
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
        <div className="flex items-center gap-2">
          <VerificationBadge level={level} size="sm" />
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="size-3" />
            {views}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="size-3" />
            {comments}
          </span>
        </div>
        <div className="flex gap-2 pt-2">
          <Button asChild size="sm" variant="default" className="flex-1">
            <Link to={`/products/${product.id}`}>
              {t("productDetails.viewDetails", "عرض التفاصيل")}
            </Link>
          </Button>
          <ContactDialog
            productId={product.id}
            productTitle={product.title}
            trigger={
              <Button size="sm" variant="outline" className="shrink-0">
                <MessageSquare className="size-4" />
              </Button>
            }
          />
        </div>
      </div>
    </Card>
  )
}
