import { cn } from "@/lib/utils"
/** Card wrapper for marketplace map pickers — consistent chrome. */
export function CompactMarketplaceMap({ children, className, title, description, footer }) {
  return (
    <div
      className={cn(
        "map-picker-clean overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      {(title || description) && (
        <div className="border-b border-border/50 px-4 py-3">
          {title ? <h3 className="text-sm font-semibold text-foreground">{title}</h3> : null}
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
      )}
      {children}
      {footer}
    </div>
  )
}
