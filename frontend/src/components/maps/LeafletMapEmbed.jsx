import { useCallback, useEffect, useMemo } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import { useMapRasterTiles } from "@/hooks/maps/useMapTheme"
import { usePrefersReducedMotion } from "@/hooks/maps/useMapInteractions"
import { getDefaultCenterFromEnv, getDefaultMapView } from "@/lib/maps/constants"
import { cn } from "@/lib/utils"

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

function FitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (!positions?.length) return
    if (positions.length === 1) {
      const [lat, lng] = positions[0]
      map.setView([lat, lng], Math.max(map.getZoom(), 12))
      return
    }
    const bounds = L.latLngBounds(positions.map(([lat, lng]) => [lat, lng]))
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 })
  }, [map, positions])
  return null
}

function MapPickEvents({ enabled, onPick }) {
  useMapEvents({
    click(e) {
      if (!enabled) return
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function FlyToPin({ lat, lng, reducedMotion }) {
  const map = useMap()
  useEffect(() => {
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: reducedMotion ? 0 : 0.45 })
  }, [lat, lng, map, reducedMotion])
  return null
}

/**
 * Shared Leaflet surface for previews and multi-marker maps. Keep imports here so feature routes stay SDK-free.
 */
export default function LeafletMapEmbed({
  markers = [],
  interactive = true,
  picking = false,
  /** When true and exactly one marker, gently fly the map to that pin (new selection). */
  flyToPrimary = false,
  onPick,
  className = "",
  mapClassName = "h-full min-h-[220px] w-full touch-manipulation",
  zoom = 11,
  showPopups = true,
  preview = false,
}) {
  const isPreview = preview
  const mapInteractive = isPreview ? false : interactive
  const mapPopups = isPreview ? false : showPopups
  const raster = useMapRasterTiles()
  const reducedMotion = usePrefersReducedMotion()
  const defaultCenter = useMemo(() => {
    const c = getDefaultCenterFromEnv()
    return [c.lat, c.lng]
  }, [])

  const positions = useMemo(() => {
    const out = []
    for (const m of markers) {
      if (m?.lat == null || m?.lng == null) continue
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) continue
      out.push([m.lat, m.lng])
    }
    return out
  }, [markers])

  const center = useMemo(() => {
    if (positions.length === 1) return positions[0]
    return defaultCenter
  }, [positions, defaultCenter])

  const handlePick = useCallback(
    (la, ln) => {
      if (typeof onPick === "function") onPick(la, ln)
    },
    [onPick]
  )

  const primary = markers[0]
  const resolvedZoom =
    positions.length === 0 ? getDefaultMapView({ hasPin: false }).zoom : zoom

  return (
    <MapContainer
      center={center}
      zoom={resolvedZoom}
      className={cn(mapClassName, className, isPreview && "map-embed-preview")}
      scrollWheelZoom={mapInteractive}
      dragging={mapInteractive}
      doubleClickZoom={mapInteractive}
      boxZoom={mapInteractive}
      keyboard={mapInteractive}
      zoomControl={mapInteractive}
    >
      <TileLayer
        attribution={isPreview ? "" : raster.attribution}
        url={raster.url}
      />
      {positions.length > 1 || (positions.length === 1 && !flyToPrimary) ? <FitBounds positions={positions} /> : null}
      {flyToPrimary && positions.length === 1 && primary?.lat != null && primary?.lng != null ? (
        <FlyToPin lat={primary.lat} lng={primary.lng} reducedMotion={reducedMotion} />
      ) : null}
      <MapPickEvents enabled={picking && mapInteractive} onPick={handlePick} />
      {markers.map((m) => {
        if (m?.lat == null || m?.lng == null || !Number.isFinite(m.lat) || !Number.isFinite(m.lng)) return null
        return (
          <Marker key={m.id ?? `${m.lat},${m.lng}`} position={[m.lat, m.lng]}>
            {mapPopups && m.label && !isPreview ? (
              <Popup>
                {m.url ? (
                  <a href={m.url} className="text-primary underline" target="_blank" rel="noopener noreferrer">
                    {m.label}
                  </a>
                ) : (
                  m.label
                )}
              </Popup>
            ) : null}
          </Marker>
        )
      })}
    </MapContainer>
  )
}
