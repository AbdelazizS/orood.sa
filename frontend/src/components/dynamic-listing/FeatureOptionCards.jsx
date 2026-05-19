import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { DynamicIcon } from "@/components/ui/DynamicIcon"

/**
 * Marketplace-style amenity toggles — compact selectable cards (Haraj / property portals).
 */
export function FeatureOptionCards({ fields, values, onChange, readonly = false, className }) {
  if (!fields?.length) return null

  return (
    <div className={cn("grid grid-cols-3 gap-2 sm:grid-cols-4", className)} role={readonly ? "list" : "group"}>
      {fields.map((field) => {
        const selected = Boolean(values?.[field.field_key])
        const label = field.label ?? field.field_key

        if (readonly) {
          if (!selected) return null
          return (
            <div
              key={field.field_key}
              role="listitem"
              className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2 py-2.5 text-center"
            >
              {field.icon ? (
                <DynamicIcon name={field.icon} className="size-5 shrink-0 text-primary" aria-hidden />
              ) : null}
              <span className="text-[11px] font-medium leading-tight text-foreground sm:text-xs">{label}</span>
            </div>
          )
        }

        return (
          <button
            key={field.field_key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(field.field_key, !selected)}
            className={cn(
              "relative flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition-colors",
              selected
                ? "border-primary bg-primary/5 text-primary shadow-sm"
                : "border-border bg-background hover:border-muted-foreground/50",
            )}
          >
            {selected ? (
              <span className="absolute end-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-2.5" strokeWidth={3} aria-hidden />
              </span>
            ) : null}
            {field.icon ? (
              <DynamicIcon
                name={field.icon}
                className={cn("size-5 shrink-0", selected ? "text-primary" : "text-muted-foreground")}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "text-[11px] font-medium leading-tight sm:text-xs",
                selected ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
