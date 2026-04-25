import { cn } from "@/lib/utils"

const STARS = [5, 4, 3, 2, 1]

/**
 * Horizontal distribution bars (5→1). `distribution` keys may be strings or numbers.
 */
export function RatingBar({ distribution = {}, total = 0, className = "", dir = "rtl" }) {
  const max = Math.max(
    1,
    ...STARS.map((s) => Number(distribution?.[s] ?? distribution?.[String(s)] ?? 0))
  )

  return (
    <div className={cn("flex flex-col gap-1.5 text-start", className)} dir={dir}>
      {STARS.map((star) => {
        const count = Number(distribution?.[star] ?? distribution?.[String(star)] ?? 0)
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        const width = total > 0 ? Math.max(4, (count / max) * 100) : 0
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-3 tabular-nums text-muted-foreground">{star}</span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/80 transition-[width]"
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="w-8 shrink-0 tabular-nums text-muted-foreground">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}
