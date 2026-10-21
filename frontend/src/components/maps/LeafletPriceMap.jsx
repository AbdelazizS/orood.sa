import { useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { TileLayer, useMap, useMapEvents } from "react-leaflet"
import { MapContainerSafe } from "@/components/maps/MapContainerSafe.jsx"
import { DeferredLeafletMarker } from "@/components/maps/DeferredLeafletMarker.jsx"
import { L, ensureLeafletDefaults } from "@/lib/maps/leafletSetup"
import { useMapRasterTiles } from "@/hooks/maps/useMapTheme"
import { getDefaultCenterFromEnv } from "@/lib/maps/constants"
import { isAwaitingMarker, priceMarkerLabel } from "@/components/maps/PriceMarker"
import { cn } from "@/lib/utils"

ensureLeafletDefaults()

const BOUNDS_DEBOUNCE_MS = 400

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function roundCoord(v) {
  return Math.round(v * 100000) / 100000
}

function MapEvents({ onBoundsChange, onMapClick }) {
  const timerRef = useRef(null)
  const map = useMapEvents({
    moveend() {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        if (!map || map._removed) return
        const b = map.getBounds()
        onBoundsChange?.({
          north: roundCoord(b.getNorth()),
          south: roundCoord(b.getSouth()),
          east: roundCoord(b.getEast()),
          west: roundCoord(b.getWest()),
        })
      }, BOUNDS_DEBOUNCE_MS)
    },
    click() {
      onMapClick?.()
    },
  })
  useEffect(() => () => clearTimeout(timerRef.current), [])
  return null
}

function FitToMarkers({ markers, fitKey }) {
  const map = useMap()
  const fittedRef = useRef(null)
  useEffect(() => {
    if (!map || map._removed || !markers.length || fittedRef.current === fitKey) return
    fittedRef.current = fitKey
    try {
      map.fitBounds(L.latLngBounds(markers.map((m) => [m.lat, m.lng])), { padding: [48, 48], maxZoom: 14 })
    } catch {
      /* map mid-teardown */
    }
  }, [map, markers, fitKey])
  return null
}

/**
 * Leaflet fallback for the price-pin map (used when no Mapbox token is configured). No clustering.
 */
export default function LeafletPriceMap({
  markers = [],
  selectedId = null,
  fitKey = "",
  onSelect,
  onBoundsChange,
  onMapClick,
  className = "",
}) {
  const { t, i18n } = useTranslation()
  const raster = useMapRasterTiles()
  const center = useMemo(() => {
    const c = getDefaultCenterFromEnv()
    return [c.lat, c.lng]
  }, [])

  const valid = useMemo(
    () => markers.filter((m) => Number.isFinite(m?.lat) && Number.isFinite(m?.lng)),
    [markers],
  )

  const icons = useMemo(() => {
    const out = new Map()
    for (const m of valid) {
      const active = String(selectedId) === String(m.id)
      const cls = cn("map-price-pin", isAwaitingMarker(m) && "map-price-pin--awaiting", active && "is-active")
      out.set(
        m.id,
        L.divIcon({
          className: "map-price-pin-icon",
          iconSize: null,
          html: `<div style="transform:translate(-50%,calc(-100% - 6px));width:max-content"><span class="${cls}">${escapeHtml(
            priceMarkerLabel(m, t, i18n.language),
          )}</span></div>`,
        }),
      )
    }
    return out
  }, [valid, selectedId, t, i18n.language])

  return (
    <MapContainerSafe center={center} zoom={10} className={cn("h-full w-full touch-manipulation", className)}>
      <TileLayer key={raster.className ?? "light"} attribution={raster.attribution} url={raster.url} className={raster.className} />
      <MapEvents onBoundsChange={onBoundsChange} onMapClick={onMapClick} />
      <FitToMarkers markers={valid} fitKey={fitKey} />
      {valid.map((m) => (
        <DeferredLeafletMarker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={icons.get(m.id)}
          zIndexOffset={String(selectedId) === String(m.id) ? 1000 : 0}
          eventHandlers={{
            click: (e) => {
              e.originalEvent?.stopPropagation?.()
              onSelect?.(m)
            },
          }}
        />
      ))}
    </MapContainerSafe>
  )
}
