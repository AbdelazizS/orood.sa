import { useEffect } from "react"
import { useInView } from "react-intersection-observer"
import { useTranslation } from "react-i18next"
import { FeedSkeleton } from "@/components/feed/FeedSkeleton"
import { ProductCard } from "@/components/feed/cards/ProductCard"
import { formatRealEstateCardMeta } from "@/lib/realEstate/labels"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

/**
 * FeedList — Haraj-style horizontal listing cards.
 * Infinite scroll + Load more button.
 */
export function FeedList({ feedQuery }) {
  const { ref, inView } = useInView({ threshold: 0 })
  const { t } = useTranslation()

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feedQuery
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (feedQuery.isLoading) {
    return <FeedSkeleton />
  }

  const items = feedQuery.data?.pages?.flatMap((page) => page?.data ?? []) ?? []
  const categoryRestricted = feedQuery.data?.pages?.[0]?.meta?.category_restricted ?? false

  return (
    <div className="space-y-4">
      {categoryRestricted && (
        <Alert>
          <AlertDescription>{t("feed.categoryNotAvailableInArea")}</AlertDescription>
        </Alert>
      )}
      {feedQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {(() => {
              const err = feedQuery.error
              const msg = err?.message ?? ""
              const code = err?.code
              if (code === "TIMEOUT" || err?.isApiTimeout) return t("feed.timeoutError")
              if (code === "ERR_NETWORK" || msg === "Network Error") return t("feed.networkError")
              return msg || t("common.errorGeneric")
            })()}
          </AlertDescription>
        </Alert>
      )}
      <div className="bg-card">
        {items.map((product) => {
          const reMeta = formatRealEstateCardMeta(product.real_estate, t)
          return (
            <ProductCard
              key={product.id}
              product={product}
              preMetaSlot={
                reMeta ? (
                  <p className="text-xs text-muted-foreground line-clamp-1">{reMeta}</p>
                ) : null
              }
            />
          )
        })}
      </div>
      {items.length === 0 && !feedQuery.isLoading && !feedQuery.isError && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground bg-card">
          {t("feed.empty")}
        </div>
      )}
      <div ref={ref} />
      {hasNextPage && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-md"
          >
            {isFetchingNextPage ? t("common.loading") : t("feed.loadMore", "تحميل المزيد")}
          </Button>
        </div>
      )}
    </div>
  )
}
