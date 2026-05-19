import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { fetchWholesaleMarketProducts } from "@/services/wholesaleService"
import { WholesaleFeedRow } from "@/components/wholesale/WholesaleFeedRow"
import { WHOLESALE_LIST_ROW_HEIGHT } from "@/components/feed/cards/ProductCard"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Related wholesale listings — full row details; reserve/cancel only on the product page.
 */
export function WholesaleRelatedDealsSection({
  product,
  user = null,
  dir = "rtl",
  variant = "default",
  className,
}) {
  const { t } = useTranslation()
  const isSidebar = variant === "sidebar"
  const isRtl = dir === "rtl"
  const categoryId = product?.category?.id ?? product?.category_id

  const params = useMemo(
    () => ({
      category_id: categoryId || undefined,
      per_page: isSidebar ? 6 : 8,
      sort: "newest",
    }),
    [categoryId, isSidebar]
  )

  const { data, isLoading } = useQuery({
    queryKey: ["wholesale", "related", product?.id, params],
    queryFn: () => fetchWholesaleMarketProducts(params),
    enabled: Boolean(product?.id && categoryId),
  })

  const rows = useMemo(() => {
    const list = data?.data ?? []
    return list.filter((p) => p.id !== product?.id).slice(0, isSidebar ? 6 : 4)
  }, [data?.data, product?.id, isSidebar])

  if (!categoryId) return null
  if (!isLoading && rows.length === 0) return null

  const rowList = (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {isLoading
        ? Array.from({ length: isSidebar ? 4 : 3 }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn("w-full border-b border-border last:border-0", WHOLESALE_LIST_ROW_HEIGHT)}
            />
          ))
        : rows.map((p) => (
            <WholesaleFeedRow key={p.id} product={p} user={user} t={t} hideActions />
          ))}
    </div>
  )

  if (isSidebar) {
    return (
      <section
        dir={dir}
        className={cn("animate-in fade-in duration-300 p-3 sm:p-4", className)}
        aria-label={t("wholesale.pdp.relatedTitle")}
      >
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">{t("wholesale.pdp.relatedTitle")}</h2>
          <Button variant="outline" size="sm" asChild className="w-fit gap-1 rounded-lg">
            <Link to="/wholesale" className="flex items-center gap-1">
              {t("wholesale.pdp.relatedBrowseMarket")}
              {isRtl ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </Link>
          </Button>
        </div>
        {rowList}
      </section>
    )
  }

  return (
    <section dir={dir} className={cn("wholesale-section-y border-t border-border/60 bg-muted/15", className)}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="text-start">
            <h2 className="wholesale-type-title text-xl sm:text-2xl">{t("wholesale.pdp.relatedTitle")}</h2>
            <p className="mt-1 wholesale-type-subtitle max-w-xl">{t("wholesale.pdp.relatedSubtitle")}</p>
          </div>
          <Link to="/wholesale" className="text-sm font-medium text-primary hover:underline">
            {t("wholesale.pdp.relatedBrowseMarket")}
          </Link>
        </div>
        {rowList}
      </div>
    </section>
  )
}
