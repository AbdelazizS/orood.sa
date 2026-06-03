import { createContext, useCallback, useContext, useEffect, useId, useState } from "react"
import { MapContainer, useMap } from "react-leaflet"
import { cn } from "@/lib/utils"
import { ensureLeafletDefaults } from "@/lib/maps/leafletSetup"

const MapReadyContext = createContext(false)
const MapReadySetterContext = createContext(null)

export function useMapSurfaceReady() {
  return useContext(MapReadyContext)
}

function MapReadyNotifier() {
  const map = useMap()
  const setReady = useContext(MapReadySetterContext)

  useEffect(() => {
    if (!map || !setReady || map._removed) return undefined

    const markReady = () => setReady(true)

    if (map._loaded) {
      markReady()
      return undefined
    }

    map.whenReady(markReady)
    return () => {
      setReady(false)
    }
  }, [map, setReady])

  return null
}

/**
 * Defers Leaflet mount one frame; exposes map readiness before markers mount.
 * Avoids "_leaflet_events" / "createIcon" races with React StrictMode and search pick.
 */
export function MapContainerSafe({ className, children, remountKey = "", ...props }) {
  ensureLeafletDefaults()

  const uid = useId()
  const mapKey = remountKey ? `${uid}-${remountKey}` : uid
  const [deferred, setDeferred] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDeferred(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    setMapReady(false)
  }, [mapKey])

  const handleSetReady = useCallback((value) => {
    setMapReady(Boolean(value))
  }, [])

  if (!deferred) {
    return <div className={cn(className, "bg-muted/25")} aria-hidden />
  }

  return (
    <MapReadySetterContext.Provider value={handleSetReady}>
      <MapReadyContext.Provider value={mapReady}>
        <MapContainer key={mapKey} className={className} {...props}>
          <MapReadyNotifier />
          {children}
        </MapContainer>
      </MapReadyContext.Provider>
    </MapReadySetterContext.Provider>
  )
}
