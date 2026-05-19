import { cn } from "@/lib/utils"
import { MAP_PICKER_MAP_CLASS } from "@/lib/maps/mapPickerUi"
import { MapSkeleton } from "./MapSkeleton.jsx"

const SHELL_VARIANTS = {
  default: "relative isolate rounded-2xl border border-border bg-card shadow-sm",
  property: "relative isolate rounded-2xl bg-muted/20 shadow-md ring-1 ring-border/50",
}

export function MapShell({
  children,
  loading = false,
  className = "",
  variant = "default",
  mapClassName = MAP_PICKER_MAP_CLASS,
  footer = null,
  header = null,
  clipOverflow = true,
}) {
  return (
    <div
      className={cn(
        SHELL_VARIANTS[variant] ?? SHELL_VARIANTS.default,
        clipOverflow ? "overflow-hidden" : "overflow-visible",
        className
      )}
    >
      {header}
      <div className={cn("relative overflow-hidden", mapClassName)}>
        {children}
        {loading ? (
          <MapSkeleton className="absolute inset-0 z-10 rounded-[inherit]" aria-hidden />
        ) : null}
      </div>
      {footer ? (
        <div className="border-t border-border/40 bg-muted/30 px-3 py-2.5 text-start sm:px-4">
          {footer}
        </div>
      ) : null}
    </div>
  )
}
