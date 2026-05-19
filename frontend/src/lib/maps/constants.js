import { getRuntimeDefaultCenter } from "@/lib/maps/runtimeConfig"

/** Riyadh — default map center when env coords missing */
export const DEFAULT_MAP_CENTER = Object.freeze({ lat: 24.7136, lng: 46.6753 })

/** Country-level zoom when no pin (Saudi Arabia overview on land) */
export const DEFAULT_SA_OVERVIEW_ZOOM = 6

const DEFAULT_PIN_ZOOM = 11

export function parseEnvCoord(val, fallback) {
  const n = Number.parseFloat(String(val ?? "").trim())
  return Number.isFinite(n) ? n : fallback
}

export function getDefaultCenterFromEnv() {
  const runtime = getRuntimeDefaultCenter()
  if (runtime && Number.isFinite(runtime.lat) && Number.isFinite(runtime.lng)) {
    return runtime
  }
  return {
    lat: parseEnvCoord(import.meta.env.VITE_MAP_DEFAULT_LAT, DEFAULT_MAP_CENTER.lat),
    lng: parseEnvCoord(import.meta.env.VITE_MAP_DEFAULT_LNG, DEFAULT_MAP_CENTER.lng),
  }
}

/**
 * Default map camera: KSA overview when no pin, street-level when pin exists.
 * @param {{ hasPin?: boolean }} opts
 */
export function getDefaultMapView({ hasPin = false } = {}) {
  return {
    center: getDefaultCenterFromEnv(),
    zoom: hasPin ? DEFAULT_PIN_ZOOM : DEFAULT_SA_OVERVIEW_ZOOM,
  }
}
