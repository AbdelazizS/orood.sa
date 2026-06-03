import {
  PRODUCT_CARD_ROW_HEIGHT,
  PRODUCT_CARD_THUMB_CLASS,
} from "@/components/feed/cards/ProductCard"

/**
 * FeedSkeleton — matches ProductCard row height, thumb, and text padding.
 */
export function FeedSkeleton() {
  return (
    <div className="bg-card">
      {[...Array(5)].map((_, index) => (
        <div
          key={index}
          className={`flex items-stretch overflow-hidden border-b border-border ${PRODUCT_CARD_ROW_HEIGHT}`}
        >
          <div className={`animate-pulse bg-muted ${PRODUCT_CARD_THUMB_CLASS}`} />
          <div className="flex h-full min-w-0 flex-1 flex-col justify-between gap-2 overflow-hidden px-3 py-3 sm:px-4 md:px-5">
            <div className="min-h-0 space-y-1.5 overflow-hidden">
              <div className="h-3 w-14 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full max-w-[90%] animate-pulse rounded bg-muted" />
            </div>
            <div className="shrink-0 space-y-1.5">
              <div className="flex h-3.5 gap-2 overflow-hidden">
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                <div className="ms-auto h-3 w-12 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
