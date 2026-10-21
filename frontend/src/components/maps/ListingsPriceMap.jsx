import { lazy, Suspense, useState } from "react"
import { isManfithEngineActive } from "@/lib/maps/provider"
import { useMapsRuntimeReady } from "@/hooks/maps/useMapsRuntimeReady"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const MapboxPriceMap = lazy(() => import("./MapboxPriceMap.jsx"))
const LeafletPriceMap = lazy(() => import("./LeafletPriceMap.jsx"))

function MapSkeleton({ className }) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-muted/60", className)} aria-busy="true">
      <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden />
    </div>
  )
}

/**
 * Aqar-style listings map with price pins. Mapbox (Manfith) when configured, Leaflet otherwise.
 * Separate from InteractiveMap so the companies map keeps its own behaviour.
 *
 * @param {{
 *   markers: Array<{ id: number, lat: number, lng: number, price: number|null, marketing_status?: string|null, title?: string }>,
 *   onSelect?: (marker: object) => void,
 *   onBoundsChange?: (bounds: { north: number, south: number, east: number, west: number }) => void,
 *   onMapClick?: () => void,
 *   selectedId?: number|string|null,
 *   fitKey?: string,
 *   className?: string,
 * }} props
 */
export function ListingsPriceMap(props) {
  const mapsReady = useMapsRuntimeReady()
  const [mapboxFailed, setMapboxFailed] = useState(false)

  if (!mapsReady) return <MapSkeleton className={props.className} />

  const useMapbox = isManfithEngineActive() && !mapboxFailed

  return (
    <Suspense fallback={<MapSkeleton className={props.className} />}>
      {useMapbox ? (
        <MapboxPriceMap {...props} onLoadFailed={() => setMapboxFailed(true)} />
      ) : (
        <LeafletPriceMap {...props} />
      )}
    </Suspense>
  )
}
