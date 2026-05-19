import { useEffect, useRef } from "react"
import { useTheme } from "@/providers/ThemeProvider"
import { createMap, loadManfithMapSdk, addClusterLayer } from "@/lib/maps/manfithAdapter"
import { cn } from "@/lib/utils"

/** Mapbox embed with native clustering for company browse maps. */
export default function MapboxClusterEmbed({
  markers = [],
  onLoadFailed,
  className = "",
  mapClassName = "h-full min-h-[320px] w-full touch-manipulation",
  zoom = 11,
}) {
  const { theme } = useTheme()
  const containerRef = useRef(null)
  const apiRef = useRef(null)
  const cleanupClusterRef = useRef(() => {})

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined

    let cancelled = false

    createMap(el, {
      zoom,
      interactive: true,
      themeMode: theme === "dark" ? "dark" : "light",
    })
      .then(async (api) => {
        if (cancelled) {
          api.destroy()
          return
        }
        apiRef.current = api
        const mapboxgl = await loadManfithMapSdk()
        cleanupClusterRef.current = addClusterLayer(api.map, mapboxgl, markers) ?? (() => {})
        requestAnimationFrame(() => api.resize())
      })
      .catch(() => {
        if (typeof onLoadFailed === "function") onLoadFailed()
      })

    return () => {
      cancelled = true
      cleanupClusterRef.current()
      if (apiRef.current) {
        apiRef.current.destroy()
        apiRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme])

  useEffect(() => {
    const api = apiRef.current
    if (!api?.map) return
    loadManfithMapSdk().then((mapboxgl) => {
      cleanupClusterRef.current()
      cleanupClusterRef.current = addClusterLayer(api.map, mapboxgl, markers) ?? (() => {})
    })
  }, [markers])

  return (
    <div ref={containerRef} className={cn(mapClassName, className)} aria-label="Map" />
  )
}
