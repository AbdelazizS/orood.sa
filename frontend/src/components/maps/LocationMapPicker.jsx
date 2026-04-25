import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { GoogleLocationMapPicker } from "@/components/maps/GoogleLocationMapPicker.jsx"
import { OsmLocationMapPicker } from "@/components/maps/OsmLocationMapPicker.jsx"

/**
 * Resolve map stack: `osm` forces Leaflet/OSM; `google` uses Google when key exists; default uses Google when `VITE_GOOGLE_MAPS_API_KEY` is set, else OSM.
 */
export function resolveMapProvider() {
  const raw = import.meta.env.VITE_MAP_PROVIDER?.trim().toLowerCase()
  if (raw === "osm") return "osm"
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  if (raw === "google") return key ? "google" : "osm"
  return key ? "google" : "osm"
}

/**
 * Location picker: Google (Places + Geocoder) when configured; OpenStreetMap (Leaflet + Nominatim) as fallback if Google script fails to load.
 */
export function LocationMapPicker(props) {
  const { t } = useTranslation()
  const [googleLoadFailed, setGoogleLoadFailed] = useState(false)
  const provider = resolveMapProvider()
  const useGoogle = provider === "google" && !googleLoadFailed

  const handleGoogleLoadFailed = useCallback(() => {
    setGoogleLoadFailed(true)
  }, [])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const active = useGoogle ? "google" : "osm"
    // eslint-disable-next-line no-console
    console.debug("[maps] provider", { requested: provider, active, googleLoadFailed })
  }, [provider, useGoogle, googleLoadFailed])

  if (useGoogle) {
    return <GoogleLocationMapPicker {...props} onLoadFailed={handleGoogleLoadFailed} />
  }

  return (
    <>
      {provider === "google" && googleLoadFailed ? (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          {t("purchase.mapFallbackOsm")}
        </p>
      ) : null}
      <OsmLocationMapPicker {...props} />
    </>
  )
}
