import { cn } from "@/lib/utils"

/**
 * Single card-style header row: optional leading (e.g. sidebar trigger) + breadcrumbs + trailing actions.
 */
export function PageHeader({ leading, breadcrumbs, trailing, className }) {
  return (
    <header
      className={cn(
        "shrink-0 rounded-xl border border-border bg-card px-3 py-2 text-card-foreground shadow-sm sm:px-4 sm:py-3",
        className
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {leading ? <div className="flex shrink-0 items-center gap-2">{leading}</div> : null}
          <div className="min-w-0 flex-1">{breadcrumbs}</div>
        </div>
        {trailing ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            {trailing}
          </div>
        ) : null}
      </div>
    </header>
  )
}
