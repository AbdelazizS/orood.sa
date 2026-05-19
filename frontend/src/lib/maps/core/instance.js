import { getDefaultCenterFromEnv } from "@/lib/maps/constants"
import { getManfithMapLocale } from "@/lib/maps/token"
import { resolveMapboxStyle } from "@/lib/maps/core/mapTheme"
import { loadManfithMapSdk } from "@/lib/maps/core/sdk"
import { animateTo } from "@/lib/maps/core/camera"
import { createMarker } from "@/lib/maps/layers/markers"
import { mapDiagEnd, mapDiagStart } from "@/lib/maps/diagnostics"

const LOAD_TIMEOUT_MS = 5_000

function buildMapApi(map, mapboxgl, container) {
  let marker = null
  let dragEndHandler = null
  let boundDragFn = null
  let resizeObserver = null

  const unbindDrag = () => {
    if (marker && boundDragFn) {
      marker.off("dragend", boundDragFn)
      boundDragFn = null
    }
  }

  const bindDrag = () => {
    unbindDrag()
    if (!marker || !dragEndHandler) return
    boundDragFn = () => {
      const ll = marker.getLngLat()
      dragEndHandler(ll.lat, ll.lng)
    }
    marker.on("dragend", boundDragFn)
  }

  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      try {
        map.resize()
      } catch {
        /* ignore */
      }
    })
    resizeObserver.observe(container)
  }

  return {
    map,
    mapboxgl,
    setCenter(lat, lng, zoomLevel, duration) {
      animateTo(map, { lat, lng }, { zoom: zoomLevel, duration })
    },
    setMarker(lat, lng, options = {}) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      if (marker) marker.remove()
      marker = createMarker(mapboxgl, map, {
        lat,
        lng,
        draggable: options.draggable ?? false,
        variant: options.variant ?? "default",
      })
      bindDrag()
      return marker
    },
    onMapClick(handler) {
      const fn = (e) => handler(e.lngLat.lat, e.lngLat.lng)
      map.on("click", fn)
      return () => map.off("click", fn)
    },
    onMarkerDragEnd(handler) {
      dragEndHandler = handler
      bindDrag()
      return () => {
        dragEndHandler = null
        unbindDrag()
      }
    },
    setStyle(themeModeNext) {
      map.setStyle(resolveMapboxStyle(themeModeNext))
    },
    resize() {
      map.resize()
    },
    destroy() {
      dragEndHandler = null
      unbindDrag()
      if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
      }
      if (marker) {
        marker.remove()
        marker = null
      }
      map.remove()
    },
  }
}

/**
 * Initialize a Mapbox map instance with resize observer and lifecycle helpers.
 * Resolves after style load; rejects on map error or load timeout.
 * @param {HTMLElement} container
 * @param {{ center?: { lat: number, lng: number }, zoom?: number, language?: string, interactive?: boolean, themeMode?: 'light'|'dark', attributionControl?: boolean, logoPosition?: string, onError?: (err: Error) => void }} [opts]
 */
export async function initializeMap(container, opts = {}) {
  mapDiagStart("map-init")
  const mapboxgl = await loadManfithMapSdk()
  const center = opts.center ?? getDefaultCenterFromEnv()
  const zoom = opts.zoom ?? 11
  const locale = getManfithMapLocale(opts.language)
  const themeMode = opts.themeMode ?? "light"

  return new Promise((resolve, reject) => {
    let settled = false
    let loadTimeoutId = null

    const fail = (cause) => {
      if (settled) return
      settled = true
      if (loadTimeoutId != null) clearTimeout(loadTimeoutId)
      try {
        map.remove()
      } catch {
        /* ignore */
      }
      const err = cause instanceof Error ? cause : new Error(String(cause ?? "mapbox_error"))
      opts.onError?.(err)
      reject(err)
    }

    const map = new mapboxgl.Map({
      container,
      style: resolveMapboxStyle(themeMode),
      center: [center.lng, center.lat],
      zoom,
      locale,
      attributionControl: opts.attributionControl !== false,
      logoPosition: opts.logoPosition ?? "bottom-left",
      interactive: opts.interactive !== false,
    })

    map.on("error", (e) => {
      fail(e?.error ?? new Error("mapbox_map_error"))
    })

    const rect = container.getBoundingClientRect?.() ?? { width: 0, height: 0 }
    const hiddenContainer = rect.width < 2 || rect.height < 2
    const loadTimeoutMs = hiddenContainer ? 4_000 : LOAD_TIMEOUT_MS

    loadTimeoutId = setTimeout(() => {
      if (!settled && typeof map.isStyleLoaded === "function" && !map.isStyleLoaded()) {
        fail(new Error("mapbox_load_timeout"))
      }
    }, loadTimeoutMs)

    map.once("load", () => {
      if (settled) return
      settled = true
      if (loadTimeoutId != null) clearTimeout(loadTimeoutId)
      mapDiagEnd("map-init")
      resolve(buildMapApi(map, mapboxgl, container))
    })
  })
}

/** @deprecated use initializeMap — kept for backward compatibility */
export const createMapInstance = initializeMap
