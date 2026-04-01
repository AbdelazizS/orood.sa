import { Star } from "lucide-react"

export function RatingBar({ distribution, total }) {
  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star] ?? 0
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div
            key={star}
            className="flex items-center gap-2 text-right"
          >
            <span className="w-3 text-xs text-muted-foreground">{star}</span>
            <Star size={10} className="shrink-0 fill-yellow-400 text-yellow-400" />
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-yellow-400 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-6 text-left text-xs text-muted-foreground">
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
