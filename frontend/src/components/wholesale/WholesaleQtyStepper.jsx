import { ChevronsUp, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Compact +/- quantity control for wholesale reserve flows.
 */
export function WholesaleQtyStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled = false,
  compact = false,
  onSetMax,
  maxLinkLabel,
  maxAriaLabel,
}) {
  const safeMax = Math.max(min, max)
  const v = Math.min(safeMax, Math.max(min, value))

  const bump = (delta) => {
    onChange?.(Math.min(safeMax, Math.max(min, v + delta)))
  }

  const showMaxLink = typeof onSetMax === "function" && maxLinkLabel && safeMax > min
  const maxAria =
    maxAriaLabel ||
    (maxLinkLabel && safeMax > min ? `${maxLinkLabel} (${safeMax})` : undefined)

  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full flex-row flex-wrap items-center justify-end gap-x-2 gap-y-1",
        compact && "sm:max-w-[min(100%,14rem)]"
      )}
    >
      <div
        className={cn(
          "inline-flex items-center rounded-xl border border-border bg-muted/30 p-0.5 shadow-sm",
          compact ? "gap-0" : "gap-0.5"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || v <= min}
          className={cn("size-9 shrink-0 rounded-lg", compact && "size-8")}
          aria-label="Decrease"
          onClick={() => bump(-1)}
        >
          <Minus className="size-4" />
        </Button>
        <span
          className={cn(
            "min-w-[2.25rem] text-center text-sm font-semibold tabular-nums text-foreground",
            compact && "min-w-8 text-xs"
          )}
          role="status"
          aria-live="polite"
        >
          {v}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || v >= safeMax}
          className={cn("size-9 shrink-0 rounded-lg", compact && "size-8")}
          aria-label="Increase"
          onClick={() => bump(1)}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      {showMaxLink ? (
        <Button
          type="button"
          variant="link"
          className="inline-flex h-auto min-h-0 shrink-0 items-center gap-1 p-0 text-xs font-medium leading-none text-primary"
          disabled={disabled}
          onClick={() => onSetMax()}
          aria-label={maxAria}
        >
          <ChevronsUp className="size-3.5 shrink-0 opacity-90" aria-hidden />
          {maxLinkLabel}
        </Button>
      ) : null}
    </div>
  )
}
