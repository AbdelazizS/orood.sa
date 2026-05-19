import { useMemo } from "react"
import {
  resolveMapProvider,
  resolveMapEngine,
  isManfithEngineActive,
} from "@/lib/maps/provider"
import { useMapsRuntimeReady } from "@/hooks/maps/useMapsRuntimeReady"

export function useMapProviderState() {
  const mapsReady = useMapsRuntimeReady()
  return useMemo(
    () => ({
      ready: mapsReady,
      engine: resolveMapEngine(),
      stack: mapsReady && isManfithEngineActive() ? "mapbox" : resolveMapProvider(),
      manfithActive: mapsReady && isManfithEngineActive(),
    }),
    [mapsReady]
  )
}
