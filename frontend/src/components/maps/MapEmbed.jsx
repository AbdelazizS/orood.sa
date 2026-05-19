import { lazy, Suspense, useState, useEffect } from "react"
import { isManfithEngineActive, resolveMapProvider } from "@/lib/maps/provider"
import { useMapsRuntimeReady } from "@/hooks/maps/useMapsRuntimeReady"
import { cn } from "@/lib/utils"

const LeafletMapEmbed = lazy(() => import("./LeafletMapEmbed.jsx"))
const MapboxMapEmbed = lazy(() => import("./MapboxMapEmbed.jsx"))

function MapSkeleton({ className }) {
  return <div className={cn("animate-pulse bg-muted/50", className)} aria-hidden />
}

/**
 * Routes display maps to Mapbox (Manfith engine) or Leaflet based on env.
 */
export function MapEmbed({ forceLegacy = false, ...props }) {
  const mapsReady = useMapsRuntimeReady()
  const useMapbox = mapsReady && !forceLegacy && isManfithEngineActive()
  const [mapboxFailed, setMapboxFailed] = useState(false)

  useEffect(() => {
    setMapboxFailed(false)
  }, [useMapbox])

  if (!mapsReady) {
    return <MapSkeleton className={props.mapClassName} />
  }

  const activeMapbox = useMapbox && !mapboxFailed
  const Embed = activeMapbox ? MapboxMapEmbed : LeafletMapEmbed

  return (
    <Suspense fallback={<MapSkeleton className={props.mapClassName} />}>
      <Embed
        {...props}
        onLoadFailed={activeMapbox ? () => setMapboxFailed(true) : undefined}
      />
    </Suspense>
  )
}

export default MapEmbed
