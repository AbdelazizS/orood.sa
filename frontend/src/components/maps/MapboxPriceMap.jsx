import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "@/providers/ThemeProvider"
import { createMap, loadManfithMapSdk, createMarker } from "@/lib/maps/manfithAdapter"
import { buildPriceMarkerElement, setPriceMarkerActive } from "@/components/maps/PriceMarker"
import { PRICE_CLUSTER_COLOR, PRICE_CLUSTER_MAX_ZOOM, PRICE_CLUSTER_RADIUS } from "@/lib/maps/priceClusters"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const SOURCE = "orood-price-pins"
const CLUSTER_LAYER = "orood-price-clusters"
const CLUSTER_COUNT_LAYER = "orood-price-clusters-count"
const BOUNDS_DEBOUNCE_MS = 400

function toGeoJson(markers) {
  return {
    type: "FeatureCollection",
    features: markers
      .filter((m) => Number.isFinite(m?.lat) && Number.isFinite(m?.lng))
      .map((m) => ({
        type: "Feature",
        properties: { id: String(m.id) },
        geometry: { type: "Point", coordinates: [m.lng, m.lat] },
      })),
  }
}

function roundCoord(v) {
  return Math.round(v * 100000) / 100000
}

/**
 * Mapbox GL price-pin map: native clusters when zoomed out, HTML price pins for unclustered points.
 */
export default function MapboxPriceMap({
  markers = [],
  selectedId = null,
  fitKey = "",
  onSelect,
  onGroupSelect,
  onBoundsChange,
  onMapClick,
  onLoadFailed,
  className = "",
}) {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const containerRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  const apiRef = useRef(null)
  const sdkRef = useRef(null)
  const readyRef = useRef(false)
  /** id → { marker, el, data } for pins currently on the map */
  const pinsRef = useRef(new Map())
  /** id → listing marker data from the API */
  const dataRef = useRef(new Map())
  const fittedKeyRef = useRef(null)
  const selectedIdRef = useRef(selectedId)
  const callbacksRef = useRef({ onSelect, onGroupSelect, onBoundsChange, onMapClick, onLoadFailed })
  const labelCtxRef = useRef({ t, lang: i18n.language })
  const markersRef = useRef(markers)
  const fitKeyRef = useRef(fitKey)

  // Keep the latest props for map event handlers (registered once per map instance).
  useLayoutEffect(() => {
    callbacksRef.current = { onSelect, onGroupSelect, onBoundsChange, onMapClick, onLoadFailed }
    labelCtxRef.current = { t, lang: i18n.language }
    markersRef.current = markers
    fitKeyRef.current = fitKey
    selectedIdRef.current = selectedId
  })

  const removeAllPins = () => {
    pinsRef.current.forEach((p) => p.marker?.remove())
    pinsRef.current.clear()
  }

  const renderPins = () => {
    const map = apiRef.current?.map
    const mapboxgl = sdkRef.current
    if (!map || !mapboxgl || !readyRef.current || !map.getSource(SOURCE)) return

    let features = []
    try {
      features = map.querySourceFeatures(SOURCE, { filter: ["!", ["has", "point_count"]] })
    } catch {
      return
    }

    const seen = new Set()
    for (const f of features) {
      const id = f.properties?.id
      if (id == null || seen.has(id)) continue
      seen.add(id)
      if (pinsRef.current.has(id)) continue
      const data = dataRef.current.get(id)
      if (!data) continue
      const { t: tr, lang } = labelCtxRef.current
      const el = buildPriceMarkerElement(data, {
        t: tr,
        lang,
        onSelect: (m) => callbacksRef.current.onSelect?.(m),
      })
      setPriceMarkerActive(el, String(selectedIdRef.current) === id)
      const marker = createMarker(mapboxgl, map, { lat: data.lat, lng: data.lng, element: el, anchor: "bottom" })
      if (marker) pinsRef.current.set(id, { marker, el, data })
    }

    pinsRef.current.forEach((p, id) => {
      if (!seen.has(id)) {
        p.marker?.remove()
        pinsRef.current.delete(id)
      }
    })
  }

  const fitToMarkersIfNeeded = () => {
    const map = apiRef.current?.map
    const mapboxgl = sdkRef.current
    const list = markersRef.current
    if (!map || !mapboxgl || !list.length || fittedKeyRef.current === fitKeyRef.current) return
    fittedKeyRef.current = fitKeyRef.current
    const bounds = new mapboxgl.LngLatBounds()
    list.forEach((m) => {
      if (Number.isFinite(m.lat) && Number.isFinite(m.lng)) bounds.extend([m.lng, m.lat])
    })
    if (bounds.isEmpty()) return
    map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 450 })
  }

  const syncData = () => {
    const map = apiRef.current?.map
    if (!map || !readyRef.current) return
    const next = new Map(markersRef.current.map((m) => [String(m.id), m]))
    // Drop pins whose listing disappeared or whose label would change.
    pinsRef.current.forEach((p, id) => {
      const d = next.get(id)
      if (!d || d.price !== p.data.price || d.marketing_status !== p.data.marketing_status || d.pin_label !== p.data.pin_label) {
        p.marker?.remove()
        pinsRef.current.delete(id)
      }
    })
    dataRef.current = next
    map.getSource(SOURCE)?.setData(toGeoJson(markersRef.current))
    fitToMarkersIfNeeded()
    renderPins()
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined

    let cancelled = false
    let boundsTimer = null

    createMap(el, {
      zoom: 10,
      interactive: true,
      themeMode: theme === "dark" ? "dark" : "light",
      onError: () => callbacksRef.current.onLoadFailed?.(),
    })
      .then(async (api) => {
        if (cancelled) {
          api.destroy()
          return
        }
        apiRef.current = api
        sdkRef.current = await loadManfithMapSdk()
        if (cancelled) return
        const map = api.map

        const setup = () => {
          if (cancelled || map.getSource(SOURCE)) return
          map.addSource(SOURCE, {
            type: "geojson",
            data: toGeoJson([]),
            cluster: true,
            clusterMaxZoom: PRICE_CLUSTER_MAX_ZOOM,
            clusterRadius: PRICE_CLUSTER_RADIUS,
          })
          map.addLayer({
            id: CLUSTER_LAYER,
            type: "circle",
            source: SOURCE,
            filter: ["has", "point_count"],
            paint: {
              "circle-color": PRICE_CLUSTER_COLOR,
              "circle-radius": ["step", ["get", "point_count"], 18, 10, 22, 50, 28],
              "circle-opacity": 0.9,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
          })
          map.addLayer({
            id: CLUSTER_COUNT_LAYER,
            type: "symbol",
            source: SOURCE,
            filter: ["has", "point_count"],
            layout: { "text-field": "{point_count_abbreviated}", "text-size": 13 },
            paint: { "text-color": "#ffffff" },
          })

          map.on("click", CLUSTER_LAYER, (e) => {
            const feature = e.features?.[0]
            const clusterId = feature?.properties?.cluster_id
            if (clusterId == null) return
            const source = map.getSource(SOURCE)
            source?.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) return
              // Same building / same spot: zooming can't separate them, so list them instead.
              if (zoom > PRICE_CLUSTER_MAX_ZOOM || map.getZoom() >= PRICE_CLUSTER_MAX_ZOOM) {
                source.getClusterLeaves(clusterId, Infinity, 0, (leavesErr, leaves) => {
                  if (leavesErr) return
                  const list = (leaves ?? []).map((f) => dataRef.current.get(String(f.properties?.id))).filter(Boolean)
                  if (list.length) callbacksRef.current.onGroupSelect?.(list)
                })
                return
              }
              map.easeTo({ center: feature.geometry.coordinates, zoom })
            })
          })
          map.on("mouseenter", CLUSTER_LAYER, () => {
            map.getCanvas().style.cursor = "pointer"
          })
          map.on("mouseleave", CLUSTER_LAYER, () => {
            map.getCanvas().style.cursor = ""
          })
          map.on("click", (e) => {
            const hits = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] })
            if (!hits.length) callbacksRef.current.onMapClick?.()
          })
          map.on("render", renderPins)
          map.on("moveend", () => {
            clearTimeout(boundsTimer)
            boundsTimer = setTimeout(() => {
              if (cancelled) return
              const b = map.getBounds()
              callbacksRef.current.onBoundsChange?.({
                north: roundCoord(b.getNorth()),
                south: roundCoord(b.getSouth()),
                east: roundCoord(b.getEast()),
                west: roundCoord(b.getWest()),
              })
            }, BOUNDS_DEBOUNCE_MS)
          })

          readyRef.current = true
          setMapReady(true)
          syncData()
          requestAnimationFrame(() => api.resize())
        }

        if (map.isStyleLoaded()) setup()
        else map.once("load", setup)
      })
      .catch(() => callbacksRef.current.onLoadFailed?.())

    return () => {
      cancelled = true
      readyRef.current = false
      setMapReady(false)
      clearTimeout(boundsTimer)
      removeAllPins()
      fittedKeyRef.current = null
      if (apiRef.current) {
        apiRef.current.destroy()
        apiRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme])

  useEffect(() => {
    syncData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, fitKey])

  // Labels depend on the language — rebuild pins when it changes.
  useEffect(() => {
    removeAllPins()
    renderPins()
  }, [i18n.language])

  useEffect(() => {
    pinsRef.current.forEach((p, id) => setPriceMarkerActive(p.el, String(selectedId) === id))
  }, [selectedId])

  return (
    <div className={cn("relative h-full w-full", className)}>
      <div ref={containerRef} className="h-full w-full touch-manipulation" aria-label="Map" />
      {mapReady ? null : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/60 text-sm text-muted-foreground">
          <Loader2 className="size-7 animate-spin" aria-hidden />
          {t("listingsMap.loadingMap", "جاري تحميل الخريطة…")}
        </div>
      )}
    </div>
  )
}
