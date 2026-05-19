import { useMemo } from "react"
import { Link } from "react-router-dom"
import { MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MapShell } from "@/components/maps/shell/MapShell.jsx"
import { LazyMapEmbed } from "@/components/maps/LazyMapEmbed.jsx"
import { OpenInMapsButton } from "@/components/maps/OpenInMapsButton.jsx"
import { MapAttributionFineprint } from "@/components/maps/MapAttributionFineprint.jsx"
import { cn } from "@/lib/utils"

/**
 * Manfith-style read-only location map: large preview, pin only, actions below.
 */
export function LocationMapPreview({
  lat,
  lng,
  title,
  subtitle = "",
  label = "",
  dir,
  viewOnMapHref,
  viewOnMapLabel,
  markerId = "location",
  className = "",
  mapHeightClass = "min-h-[280px] h-[320px] sm:min-h-[320px] sm:h-[380px] lg:h-[420px]",
  headerAction = null,
  showAttribution = true,
  forceLegacy = false,
}) {
  const la = lat != null ? Number(lat) : null
  const ln = lng != null ? Number(lng) : null
  const hasCoords = la != null && ln != null && Number.isFinite(la) && Number.isFinite(ln)

  if (!hasCoords) return null

  const resolvedLabel = label || title || ""
  const showHeader = Boolean(title || subtitle || viewOnMapHref || headerAction)

  const markers = useMemo(
    () => [{ id: markerId, lat: la, lng: ln, variant: "property" }],
    [markerId, la, ln]
  )

  return (
    <section dir={dir} className={cn("space-y-3", className)}>
      {showHeader ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 text-start">
            {title ? (
              <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
            ) : null}
            {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {headerAction ??
            (viewOnMapHref && viewOnMapLabel ? (
              <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" asChild>
                <Link to={viewOnMapHref}>
                  <MapPin className="size-3.5" aria-hidden />
                  {viewOnMapLabel}
                </Link>
              </Button>
            ) : null)}
        </div>
      ) : null}

      <MapShell className="overflow-hidden rounded-2xl shadow-md" mapClassName={cn("relative", mapHeightClass)}>
        <LazyMapEmbed
          preview
          forceLegacy={forceLegacy}
          className="h-full w-full min-h-[inherit]"
          markers={markers}
          interactive={false}
          flyToPrimary
          showPopups={false}
          zoom={14}
          mapClassName="h-full min-h-[inherit] w-full"
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-background/30 via-transparent to-transparent"
          aria-hidden
        />
      </MapShell>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <OpenInMapsButton lat={la} lng={ln} label={resolvedLabel} />
        </div>
        {showAttribution ? <MapAttributionFineprint className="ms-auto" /> : null}
      </div>
    </section>
  )
}
