import { useEffect, useRef } from "react"
import { useTheme } from "@/providers/ThemeProvider"
import {
  createMap,
  loadManfithMapSdk,
  fitBounds,
  createMarker,
  attachPopup,
  setRouteLine,
  removeRouteLine,
} from "@/lib/maps/manfithAdapter"
import { getDefaultCenterFromEnv } from "@/lib/maps/constants"
import { cn } from "@/lib/utils"

/** Delivery destination map with optional route line and pulse marker. */
export default function MapboxDeliveryEmbed({
  lat,
  lng,
  label = "",
  originLat,
  originLng,
  className = "",
  mapClassName = "min-h-[220px] h-[260px] w-full touch-manipulation",
}) {
  const { theme } = useTheme()
  const containerRef = useRef(null)
  const apiRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined

    let cancelled = false
    const dest = { lat: Number(lat), lng: Number(lng) }

    createMap(el, {
      zoom: 14,
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

        const mk = createMarker(mapboxgl, api.map, {
          lat: dest.lat,
          lng: dest.lng,
          variant: "delivery",
        })
        if (mk && label) attachPopup(mapboxgl, mk, { label })

        const hasOrigin =
          originLat != null &&
          originLng != null &&
          Number.isFinite(Number(originLat)) &&
          Number.isFinite(Number(originLng))

        if (hasOrigin) {
          const from = { lat: Number(originLat), lng: Number(originLng) }
          setRouteLine(api.map, from, dest)
          fitBounds(api.map, mapboxgl, [
            [from.lat, from.lng],
            [dest.lat, dest.lng],
          ])
        } else {
          api.setCenter(dest.lat, dest.lng, 14)
        }

        requestAnimationFrame(() => api.resize())
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (apiRef.current?.map) removeRouteLine(apiRef.current.map)
      if (apiRef.current) {
        apiRef.current.destroy()
        apiRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, lat, lng, label, originLat, originLng])

  return (
    <div ref={containerRef} className={cn(mapClassName, className)} aria-label="Delivery map" />
  )
}
