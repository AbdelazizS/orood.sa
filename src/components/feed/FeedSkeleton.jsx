import { cn } from "@/lib/utils"

/**
 * FeedSkeleton mirrors ProductCard layout for consistent loading states.
 */
export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, index) => (
        <div
          key={index}
          className={cn(
            "flex overflow-hidden rounded-xl border bg-card shadow-sm",
            "flex-col md:flex-row",
          )}
        >
          <div className="aspect-[4/3] w-full animate-pulse bg-muted/60 md:aspect-square md:h-[200px] md:w-72 lg:w-80" />
          <div className="flex flex-1 flex-col">
            <div className="flex flex-col gap-4 p-4 pb-2 md:p-5">
              <div className="space-y-2">
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted/60" />
                <div className="h-4 w-full animate-pulse rounded bg-muted/50" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted/50" />
              </div>
              <div className="flex gap-4">
                <div className="h-6 w-24 animate-pulse rounded bg-muted/60" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted/50" />
              </div>
              <div className="flex gap-4">
                <div className="h-3 w-12 animate-pulse rounded bg-muted/50" />
                <div className="h-3 w-12 animate-pulse rounded bg-muted/50" />
                <div className="h-3 w-12 animate-pulse rounded bg-muted/50" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 border-t bg-muted/30 px-4 py-3 md:px-5">
              <div className="flex items-center gap-3">
                <div className="size-9 animate-pulse rounded-full bg-muted/60" />
                <div className="space-y-1">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted/60" />
                  <div className="h-3 w-16 animate-pulse rounded bg-muted/50" />
                </div>
              </div>
              <div className="h-8 w-24 animate-pulse rounded-full bg-muted/60" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
