import { Marker } from "react-leaflet"
import { useMapSurfaceReady } from "@/components/maps/MapContainerSafe.jsx"

/** Mount pin only after Leaflet map surface is ready — prevents createIcon / _leaflet_events crashes. */
export function DeferredLeafletMarker({ position, ...props }) {
  const mapReady = useMapSurfaceReady()
  if (!mapReady || !position) return null
  return <Marker position={position} {...props} />
}
