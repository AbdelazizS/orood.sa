import { PRODUCT_CARD_ROW_HEIGHT } from "@/components/feed/cards/ProductCard"

/**
 * FeedSkeleton — matches ProductCard row height and image column width.
 */
export function FeedSkeleton() {
  return (
    <div className="bg-card">
      {[...Array(5)].map((_, index) => (
        <div
          key={index}
          className={`flex items-stretch gap-0 border-b border-border ${PRODUCT_CARD_ROW_HEIGHT}`}
        >
          <div className="h-full w-[140px] shrink-0 animate-pulse bg-muted sm:w-[160px]" />
          <div className="flex h-full min-w-0 flex-1 flex-col justify-between px-4 py-3 sm:px-5">
            <div className="space-y-2">
              <div className="h-3 w-14 animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="mt-1 flex justify-between">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
