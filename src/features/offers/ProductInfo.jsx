import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { MapPin, FolderTree } from "lucide-react"
import { timeAgo } from "@/lib/timeAgo"
import { ProductOptionsDisplay } from "@/features/offers/ProductOptionsDisplay"
import { cn } from "@/lib/utils"

/**
 * ProductInfo — Title, badges, category, location, posted time, description, stats, options.
 */
export function ProductInfo({ product }) {
  const { t } = useTranslation()
  const isUsed = product?.condition === "used"
  const isRequest = product?.type === "request"

  return (
    <div className="space-y-6">
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={cn(
            isRequest ? "bg-blue-600 text-white" : "bg-primary text-primary-foreground"
          )}
        >
          {isRequest ? t("feed.request") : t("feed.offer")}
        </Badge>
        {!isRequest && (
          <Badge variant={isUsed ? "secondary" : "default"} className={isUsed ? "" : "bg-blue-600"}>
            {isUsed ? t("feed.used") : t("feed.new")}
          </Badge>
        )}
        {product?.warranty && (
          <Badge variant="secondary">
            {t("feed.warranty", { period: product.warranty })}
          </Badge>
        )}
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
        {product?.title}
      </h1>

      {/* Meta: category, location, posted */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {product?.category && (
          <span className="flex items-center gap-1.5">
            <FolderTree className="size-4 shrink-0" />
            {product.category.name}
            {product.subcategory && ` › ${product.subcategory.name}`}
          </span>
        )}
        {product?.location && (
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" />
            {product.location}
          </span>
        )}
        {product?.published_at && (
          <span>{timeAgo(product.published_at, t)}</span>
        )}
      </div>

      {/* Options */}
      <ProductOptionsDisplay shippingDetails={product?.shipping_details} />

      {/* Description */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {isRequest
            ? t("productDetails.lookingFor", "Looking for")
            : t("productDetails.description", "Description")}
        </h2>
        <p className="whitespace-pre-wrap leading-relaxed text-foreground">
          {product?.description}
        </p>
      </div>
    </div>
  )
}
