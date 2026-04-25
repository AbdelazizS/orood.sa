import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

const sizes = { xs: 11, sm: 14, md: 18, lg: 24 }

/**
 * Star row: interactive (onChange) or readonly. Optional numeric value + review count labels.
 */
export function StarRating({
  value = 0,
  onChange,
  readonly = false,
  size = "md",
  showValue = false,
  className = "",
}) {
  const [hovered, setHovered] = useState(0)
  const s = sizes[size] ?? 18
  const displayActive = readonly ? value : hovered || value

  const starClass = (star) =>
    cn(
      "transition-colors",
      displayActive >= star ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted-foreground/30"
    )

  return (
    <div className={cn("flex flex-wrap items-center gap-0.5", className)}>
      {readonly ? (
        [1, 2, 3, 4, 5].map((star) => (
          <Star key={star} size={s} className={starClass(star)} aria-hidden />
        ))
      ) : (
        [1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="cursor-pointer transition-all duration-100 hover:scale-110"
          >
            <Star size={s} className={starClass(star)} />
          </button>
        ))
      )}
      {showValue && value > 0 && (
        <span className="ms-0.5 text-xs font-semibold tabular-nums text-foreground">
          ({Number(value).toFixed(1)})
        </span>
      )}
    </div>
  )
}
