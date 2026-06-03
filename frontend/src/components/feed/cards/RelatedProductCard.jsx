import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MapPin, MessageSquare, Eye, ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProductImage } from "@/components/ui/ProductImage"
import { VerificationBadge } from "@/components/auth/VerificationBadge"
import { ContactDialog } from "@/components/chat/ContactDialog"

const formatPrice = (price) => {
  if (price == null || price === undefined) return null
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * RelatedProductCard — for similar products grid sections.
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
  const formattedPrice = formatPrice(product?.price)
  const level = product?.seller?.verification_level === "company_verified" ? "blue"
    : product?.seller?.verification_level === "id_verified" ? "gold"
    : product?.seller?.email_verified ? "green" : "grey"

  return (
    <Card
      className={cn(
        "group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200",
        "hover:scale-[1.02] hover:shadow-md",
        "focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-2",
        className
      )}
    >
      <Link to={detailTo} state={{ from }} className="block shrink-0">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted/50">
          <ProductImage
            src={imageUrl}
            alt={product?.title ?? ""}
            categorySlug={product?.category?.slug}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
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
      </Link>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        <Link to={detailTo} state={{ from }} className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug hover:underline">
            {product?.title}
          </h3>
        </Link>

        {formattedPrice != null ? (
          <p className="flex min-w-0 items-center gap-1.5 truncate text-base font-bold text-primary">
            <ShoppingBag className="size-4 shrink-0" />
            <span className="truncate">{formattedPrice}</span>
          </p>
        ) : null}

        {product?.location ? (
          <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{product.location}</span>
          </p>
        ) : null}

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <VerificationBadge level={level} size="sm" />
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="size-3 shrink-0" />
            {views}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="size-3 shrink-0" />
            {comments}
          </span>
        </div>

        <div className="mt-auto flex min-w-0 gap-2 pt-1">
          <Button asChild size="sm" variant="default" className="min-w-0 flex-1">
            <Link to={detailTo} state={{ from }} className="truncate">
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
