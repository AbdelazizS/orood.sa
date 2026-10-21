import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { TileLayer, useMap, useMapEvents } from "react-leaflet"
import Supercluster from "supercluster"
import { MapContainerSafe } from "@/components/maps/MapContainerSafe.jsx"
import { DeferredLeafletMarker } from "@/components/maps/DeferredLeafletMarker.jsx"
import { L, ensureLeafletDefaults } from "@/lib/maps/leafletSetup"
import { useMapRasterTiles } from "@/hooks/maps/useMapTheme"
import { getDefaultCenterFromEnv } from "@/lib/maps/constants"
import { isAwaitingMarker, priceMarkerLabel } from "@/components/maps/PriceMarker"
import { PRICE_CLUSTER_MAX_ZOOM, PRICE_CLUSTER_RADIUS, clusterBubbleSize } from "@/lib/maps/priceClusters"
import { cn } from "@/lib/utils"

ensureLeafletDefaults()

const BOUNDS_DEBOUNCE_MS = 400
const MAP_MAX_ZOOM = 18

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function roundCoord(v) {
  return Math.round(v * 100000) / 100000
}

/** Reports the visible area (for the API query) and the current view (for clustering). */
function MapEvents({ onBoundsChange, onMapClick, onViewChange }) {
  const timerRef = useRef(null)
  const map = useMapEvents({
    moveend() {
      onViewChange()
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

/** Exposes the Leaflet map instance to the parent once it exists. */
function MapHandle({ onMap }) {
  const map = useMap()
  useEffect(() => {
    onMap(map)
    return () => onMap(null)
  }, [map, onMap])
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
 * Leaflet fallback for the price-pin map (used when no Mapbox token is configured).
 * Nearby listings are grouped into numbered bubbles (supercluster); a bubble that can't split
 * any further (same building / same spot) hands its listings to `onGroupSelect`.
 */
export default function LeafletPriceMap({
  markers = [],
  selectedId = null,
  fitKey = "",
  onSelect,
  onGroupSelect,
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
  const [map, setMap] = useState(null)
  const [view, setView] = useState(null)

  const valid = useMemo(
    () => markers.filter((m) => Number.isFinite(m?.lat) && Number.isFinite(m?.lng)),
    [markers],
  )

  const index = useMemo(() => {
    // extent 256 = Leaflet's tile size, so the radius is in real screen pixels.
    const sc = new Supercluster({ radius: PRICE_CLUSTER_RADIUS, maxZoom: PRICE_CLUSTER_MAX_ZOOM, extent: 256 })
    sc.load(
      valid.map((m) => ({
        type: "Feature",
        properties: { id: m.id },
        geometry: { type: "Point", coordinates: [m.lng, m.lat] },
      })),
    )
    return sc
  }, [valid])

  const byId = useMemo(() => new Map(valid.map((m) => [String(m.id), m])), [valid])

  const readView = useCallback(() => {
    if (!map || map._removed) return
    const b = map.getBounds()
    setView({ zoom: map.getZoom(), bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] })
  }, [map])

  useEffect(() => {
    if (!map) return undefined
    map.whenReady(readView)
    return undefined
  }, [map, readView])

  const items = useMemo(() => {
    if (!view) return []
    // Clusters are kept up to PRICE_CLUSTER_MAX_ZOOM so pins on the same spot never stack.
    const zoom = Math.min(Math.round(view.zoom), PRICE_CLUSTER_MAX_ZOOM)
    try {
      return index.getClusters(view.bbox, zoom)
    } catch {
      return []
    }
  }, [index, view])

  const openCluster = useCallback(
    (feature) => {
      if (!map) return
      const clusterId = feature.properties.cluster_id
      const [lng, lat] = feature.geometry.coordinates
      let expansion = MAP_MAX_ZOOM + 1
      try {
        expansion = index.getClusterExpansionZoom(clusterId)
      } catch {
        /* stale cluster id after a data refresh */
      }
      if (expansion > PRICE_CLUSTER_MAX_ZOOM || map.getZoom() >= PRICE_CLUSTER_MAX_ZOOM) {
        const leaves = index.getLeaves(clusterId, Infinity).map((f) => byId.get(String(f.properties.id))).filter(Boolean)
        if (leaves.length) onGroupSelect?.(leaves)
        return
      }
      map.flyTo([lat, lng], Math.min(expansion, MAP_MAX_ZOOM), { duration: 0.45 })
    },
    [map, index, byId, onGroupSelect],
  )

  // Reuse icon objects between renders so Leaflet doesn't rebuild every pin on each move.
  // Pin labels depend on the language, so the cache starts fresh when it changes.
  const iconFor = useMemo(() => {
    const cache = new Map()
    return (key, html) => {
      let icon = cache.get(key)
      if (!icon) {
        icon = L.divIcon({ className: "map-price-pin-icon", iconSize: null, html })
        cache.set(key, icon)
      }
      return icon
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language])

  return (
    <MapContainerSafe
      center={center}
      zoom={10}
      maxZoom={MAP_MAX_ZOOM}
      className={cn("h-full w-full touch-manipulation", className)}
    >
      <TileLayer
        key={raster.className ?? "light"}
        attribution={raster.attribution}
        url={raster.url}
        className={raster.className}
        maxZoom={MAP_MAX_ZOOM}
      />
      <MapHandle onMap={setMap} />
      <MapEvents onBoundsChange={onBoundsChange} onMapClick={onMapClick} onViewChange={readView} />
      <FitToMarkers markers={valid} fitKey={fitKey} />
      {items.map((f) => {
        const [lng, lat] = f.geometry.coordinates
        if (f.properties.cluster) {
          const count = f.properties.point_count
          const size = clusterBubbleSize(count)
          const html = `<div class="map-price-cluster" style="width:${size}px;height:${size}px;transform:translate(-50%,-50%)">${count}</div>`
          return (
            <DeferredLeafletMarker
              key={`c-${f.properties.cluster_id}`}
              position={[lat, lng]}
              icon={iconFor(`c-${count}`, html)}
              zIndexOffset={500}
              title={t("listingsMap.clusterTitle", { count, defaultValue: "{{count}} إعلانات" })}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent?.stopPropagation?.()
                  openCluster(f)
                },
              }}
            />
          )
        }
        const m = byId.get(String(f.properties.id))
        if (!m) return null
        const active = String(selectedId) === String(m.id)
        const cls = cn("map-price-pin", isAwaitingMarker(m) && "map-price-pin--awaiting", active && "is-active")
        const label = priceMarkerLabel(m, t, i18n.language)
        const html = `<div style="transform:translate(-50%,calc(-100% - 6px));width:max-content"><span class="${cls}">${escapeHtml(label)}</span></div>`
        return (
          <DeferredLeafletMarker
            key={`p-${m.id}`}
            position={[m.lat, m.lng]}
            icon={iconFor(`p-${cls}-${label}`, html)}
            zIndexOffset={active ? 1000 : 0}
            title={m.title ?? label}
            eventHandlers={{
              click: (e) => {
                e.originalEvent?.stopPropagation?.()
                onSelect?.(m)
              },
            }}
          />
        )
      })}
    </MapContainerSafe>
  )
}
