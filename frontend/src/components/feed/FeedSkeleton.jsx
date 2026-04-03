/**
 * FeedSkeleton — Matches ProductCard layout and height (120px).
 */
export function FeedSkeleton() {
  return (
    <div className="bg-card">
      {[...Array(5)].map((_, index) => (
        <div
          key={index}
          className="flex items-stretch gap-0 border-b border-border h-[120px]"
        >
          <div className="w-[140px] sm:w-[160px] h-[120px] shrink-0 animate-pulse bg-muted" />
          <div className="flex-1 min-w-0 flex flex-col justify-between py-3 px-4 sm:px-5">
            <div className="space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="flex gap-3">
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                <div className="h-3 w-14 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-5 w-12 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
