import { useEffect, useMemo, useRef } from "react"
import { useTheme } from "@/providers/ThemeProvider"
import {
  createMap,
  loadManfithMapSdk,
  fitBounds,
  createMarker,
  attachPopup,
} from "@/lib/maps/manfithAdapter"
import { cn } from "@/lib/utils"

/**
 * Read-only Mapbox GL embed (markers, optional pick). Used via MapEmbed when Mapbox is active.
 */
export default function MapboxMapEmbed({
  markers = [],
  interactive = true,
  picking = false,
  flyToPrimary = false,
  showPopups = true,
  /** Manfith-style company preview: no popups, no logo/attrib on canvas, pin only */
  preview = false,
  onPick,
  onLoadFailed,
  className = "",
  mapClassName = "h-full min-h-[220px] w-full touch-manipulation",
  zoom = 11,
}) {
  const isPreview = preview
  const mapInteractive = isPreview ? false : interactive
  const mapPopups = isPreview ? false : showPopups
  const { theme } = useTheme()
  const containerRef = useRef(null)
  const apiRef = useRef(null)
  const markerRefsRef = useRef([])

  const positions = useMemo(() => {
    const out = []
    for (const m of markers) {
      if (m?.lat == null || m?.lng == null) continue
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) continue
      out.push([m.lat, m.lng])
    }
    return out
  }, [markers])

  const syncMarkers = (api, mapboxgl) => {
    markerRefsRef.current.forEach((mk) => mk.remove())
    markerRefsRef.current = []

    markers.forEach((m) => {
      if (m?.lat == null || m?.lng == null || !Number.isFinite(m.lat) || !Number.isFinite(m.lng)) return
      const mk = createMarker(mapboxgl, api.map, {
        lat: m.lat,
        lng: m.lng,
        variant: m.variant ?? "default",
      })
      if (mk && mapPopups && m.label && !isPreview) {
        attachPopup(mapboxgl, mk, { label: m.label, url: m.url })
      }
      if (mk) markerRefsRef.current.push(mk)
    })

    if (flyToPrimary && positions.length === 1) {
      const [la, ln] = positions[0]
      api.setCenter(la, ln, 13)
    } else if (positions.length) {
      fitBounds(api.map, mapboxgl, positions)
    }
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined

    let cancelled = false
    let cleanupClick = () => {}

    createMap(el, {
      zoom,
      interactive: mapInteractive,
      attributionControl: !isPreview,
      themeMode: theme === "dark" ? "dark" : "light",
      onError: () => {
        if (typeof onLoadFailed === "function") onLoadFailed()
      },
    })
      .then(async (api) => {
        if (cancelled) {
          api.destroy()
          return
        }
        apiRef.current = api
        const mapboxgl = await loadManfithMapSdk()
        syncMarkers(api, mapboxgl)

        if (picking && mapInteractive && typeof onPick === "function") {
          const unbind = api.onMapClick((la, ln) => onPick(la, ln))
          if (typeof unbind === "function") cleanupClick = unbind
        }

        const resizeOnce = () => {
          try {
            api.resize()
          } catch {
            /* ignore */
          }
        }
        if (api.map.isStyleLoaded()) resizeOnce()
        else api.map.once("load", resizeOnce)
        requestAnimationFrame(resizeOnce)
      })
      .catch(() => {
        if (typeof onLoadFailed === "function") onLoadFailed()
      })

    return () => {
      cancelled = true
      if (typeof cleanupClick === "function") cleanupClick()
      markerRefsRef.current.forEach((mk) => mk.remove())
      markerRefsRef.current = []
      if (apiRef.current) {
        apiRef.current.destroy()
        apiRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme])

  useEffect(() => {
    const api = apiRef.current
    if (!api) return
    loadManfithMapSdk().then((mapboxgl) => syncMarkers(api, mapboxgl))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, positions, flyToPrimary, showPopups, isPreview, mapPopups])

  return (
    <div
      ref={containerRef}
      className={cn(mapClassName, className, isPreview && "map-embed-preview")}
      aria-label="Map"
    />
  )
}
