import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/feed/cards/ProductCard"
import apiClient from "@/lib/apiClient"
import { ChevronLeft, ChevronRight, Package } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * SimilarProductsSection — same card as home page (ProductCard).
 * Sidebar variant: stacked vertically beside product details.
 */
export function SimilarProductsSection({ product, variant = "default" }) {
  const { t } = useTranslation()
  const { id } = useParams()
  const isSidebar = variant === "sidebar"
  const { direction } = useAppDirection()
  const isRtl = direction === "rtl"

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
      <section
        className={cn(
          "animate-in fade-in duration-300",
          isSidebar ? "p-3 sm:p-4" : "mt-16"
        )}
        aria-label={t("productDetails.similarProducts")}
      >
        <div className="mb-4">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          {Array.from({ length: isSidebar ? 4 : 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section
      className={cn(
        "animate-in fade-in duration-300",
        isSidebar ? "p-3 sm:p-4" : "mt-16 border-t border-border pt-12"
      )}
      aria-label={t("productDetails.similarProducts")}
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold">
          {t("productDetails.similarListings", "عروض مشابهة")}
        </h2>
        <Button variant="outline" size="sm" asChild className="w-fit gap-1 rounded-lg">
          <Link to={seeMoreUrl} className="flex items-center gap-1">
            {t("productDetails.seeMore", "عرض المزيد")}
            {isRtl ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </Link>
        </Button>
      </div>

      {products.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} compact={isSidebar} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
          <Package className="size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            {t("productDetails.noSimilarListings", "لا توجد عروض مشابهة")}
          </p>
        </div>
      )}
    </section>
  )
}
