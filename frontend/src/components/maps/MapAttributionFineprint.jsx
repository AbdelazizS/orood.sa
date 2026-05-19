import { cn } from "@/lib/utils"

/** Required when Mapbox attribution control is hidden on preview embeds. */
export function MapAttributionFineprint({ className = "" }) {
  return (
    <p className={cn("text-[10px] leading-snug text-muted-foreground/80", className)}>
      © Mapbox © OpenStreetMap
    </p>
  )
}
