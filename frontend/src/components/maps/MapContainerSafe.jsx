import { useEffect, useId, useState } from "react"
import { MapContainer } from "react-leaflet"
import { cn } from "@/lib/utils"

/**
 * Defers Leaflet mount one frame and uses a stable key — avoids
 * "Cannot read properties of undefined (reading '_leaflet_events')" with React StrictMode.
 */
export function MapContainerSafe({ className, children, remountKey = "", ...props }) {
  const uid = useId()
  const mapKey = remountKey ? `${uid}-${remountKey}` : uid
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(false)
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [mapKey])

  if (!ready) {
    return <div className={cn(className, "bg-muted/25")} aria-hidden />
  }

  return (
    <MapContainer key={mapKey} className={className} {...props}>
      {children}
    </MapContainer>
  )
}
