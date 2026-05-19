import { resolveDiscoveredStyleUrl } from "@/lib/maps/manfithSdkBridge"
import { getRuntimeMapboxToken, getRuntimeMapStyleId } from "@/lib/maps/runtimeConfig"

export function getManfithAccessToken() {
  return (
    getRuntimeMapboxToken() ||
    import.meta.env.VITE_MANFITH_MAP_PUBLIC_TOKEN?.trim() ||
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ||
    ""
  )
}

export function isManfithMapConfigured() {
  return Boolean(getManfithAccessToken())
}

export function getManfithMapLocale(language) {
  const env = import.meta.env.VITE_MANFITH_LOCALE?.trim()
  if (env === "ar" || env === "en") return env
  return String(language || "").toLowerCase().startsWith("ar") ? "ar" : "en"
}

/** @param {'light' | 'dark'} [themeMode] */
export function getManfithStyleUrl(themeMode = "light") {
  if (themeMode === "dark" && !import.meta.env.VITE_MANFITH_MAP_STYLE_ID?.trim()) {
    return "mapbox://styles/mapbox/dark-v11"
  }

  const styleId =
    import.meta.env.VITE_MANFITH_MAP_STYLE_ID?.trim() ||
    getRuntimeMapStyleId()?.trim() ||
    ""

  const apiBase = import.meta.env.VITE_MANFITH_MAP_API_BASE?.trim()

  if (styleId?.startsWith("mapbox://") || styleId?.startsWith("http")) {
    return styleId
  }
  if (styleId?.includes("/") && !styleId.includes("://")) {
    return `mapbox://styles/${styleId}`
  }
  if (styleId && apiBase) {
    return `${apiBase.replace(/\/$/, "")}/styles/${styleId}`
  }
  const discovered = resolveDiscoveredStyleUrl()
  if (discovered) return discovered
  return "mapbox://styles/mapbox/streets-v12"
}
