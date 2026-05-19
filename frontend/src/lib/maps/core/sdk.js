import { isManfithMapConfigured, getManfithAccessToken } from "@/lib/maps/token"
import { ensureRtlTextPlugin } from "@/lib/maps/core/rtl"
import { mapDiagEnd, mapDiagStart } from "@/lib/maps/diagnostics"

let sdkPromise = null

/**
 * @returns {Promise<typeof import('mapbox-gl')>}
 */
export function loadManfithMapSdk() {
  if (!isManfithMapConfigured()) {
    return Promise.reject(new Error("manfith_map_token_missing"))
  }
  if (!sdkPromise) {
    sdkPromise = (async () => {
      mapDiagStart("sdk-load")
      const mod = await import("mapbox-gl")
      await import("mapbox-gl/dist/mapbox-gl.css")
      const mapboxgl = mod.default ?? mod
      mapboxgl.accessToken = getManfithAccessToken()
      await ensureRtlTextPlugin(mapboxgl)
      mapDiagEnd("sdk-load")
      return mapboxgl
    })()
  }
  return sdkPromise
}

export function resetManfithMapSdkForTests() {
  sdkPromise = null
}
