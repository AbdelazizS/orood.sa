import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MapPin, Package, MessageSquare, Eye, ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProductImage } from "@/components/ui/ProductImage"
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
 * RelatedProductCard â€” for similar products section.
 * Image, title, price or "Ø§Ø³Ø£Ù„ Ø§Ù„Ø³Ø¹Ø±", location, seller badge, stats, CTA buttons.
 */
export function RelatedProductCard({ product, className }) {
  const { t } = useTranslation()
  const location = useLocation()
  const from = `${location.pathname}${location.search}`
  const detailTo = product?.is_wholesale
    ? `/wholesale/product/${product.id}`
    : `/products/${product.id}`
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
      <Link to={detailTo} state={{ from }} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted/50">
          <ProductImage
            src={imageUrl}
            alt={product?.title ?? ""}
            categorySlug={product?.category?.slug}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
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
        <Link to={detailTo} state={{ from }}>
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
            <Link to={detailTo} state={{ from }}>
              {t("productDetails.viewDetails", "Ø¹Ø±Ø¶ Ø§Ù„ØªÙØ§ØµÙŠÙ„")}
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
