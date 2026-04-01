import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export function StarRating({
  value = 0,
  onChange,
  readonly = false,
  size = "md",
  showValue = false,
  className = "",
}) {
  const [hovered, setHovered] = useState(0)
  const sizes = { xs: 11, sm: 14, md: 18, lg: 24 }
  const s = sizes[size] ?? 18

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={cn(
            "transition-all duration-100",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
        >
          <Star
            size={s}
            className={cn(
              "transition-colors",
              (hovered || value) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted-foreground/30"
            )}
          />
        </button>
      ))}
      {showValue && value > 0 && (
        <span className="ms-1 text-xs font-semibold text-foreground">
          {Number(value).toFixed(1)}
        </span>
      )}
    </div>
  )
}
