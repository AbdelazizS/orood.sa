import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { RelatedProductCard } from "@/components/feed/cards/RelatedProductCard"
import apiClient from "@/lib/apiClient"
import { ChevronLeft, Package } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * SimilarProductsSection — full-width section below comments.
 * Smart matching: subcategory → category → city → type.
 * Grid: 1 col mobile, 2 tablet, 4 desktop. Skeleton, empty state, See more link.
 */
export function SimilarProductsSection({ product }) {
  const { t } = useTranslation()
  const { id } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: ["product", id, "similar"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/products/${id}/similar`)
      return data?.data ?? []
    },
    enabled: Boolean(id),
  })

  const products = data ?? []
  const categoryId = product?.category?.id
  const seeMoreUrl = categoryId ? `/?category=${categoryId}` : "/"

  if (isLoading) {
    return (
      <section className="mt-16 animate-in fade-in duration-300" aria-label={t("productDetails.similarProducts")}>
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-2xl" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section
      className={cn(
        "mt-16 animate-in fade-in duration-300",
        "border-t border-border pt-12"
      )}
      aria-label={t("productDetails.similarProducts")}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">
          {t("productDetails.similarListings", "Similar Listings")}
        </h2>
        <Button variant="outline" size="sm" asChild className="gap-1.5 rounded-xl">
          <Link to={seeMoreUrl}>
            {t("productDetails.seeMore", "See more")}
            <ChevronLeft className="size-4 rtl-rotate" />
          </Link>
        </Button>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <RelatedProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center">
          <Package className="size-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">
            {t("productDetails.noSimilarListings", "No similar listings found")}
          </p>
        </div>
      )}
    </section>
  )
}
