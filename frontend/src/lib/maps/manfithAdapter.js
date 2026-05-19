/**
 * Manfith / Mapbox GL facade — re-exports core modules for app use.
 * Do not import mapbox-gl directly from pages; use this module or hooks.
 */
import { isManfithVendorCloned } from "@/lib/maps/manfithSdkBridge"
import { initializeMap } from "@/lib/maps/core/instance"
import { loadManfithMapSdk, resetManfithMapSdkForTests } from "@/lib/maps/core/sdk"
import { fitBounds, animateTo } from "@/lib/maps/core/camera"
import { addDefaultControls } from "@/lib/maps/core/controls"
import { createMarker, attachPopup } from "@/lib/maps/layers/markers"
import { addClusterLayer, removeClusterLayer, pointsToGeoJson } from "@/lib/maps/layers/cluster"
import { setRouteLine, removeRouteLine } from "@/lib/maps/layers/route"
import {
  getManfithAccessToken,
  isManfithMapConfigured,
  getManfithStyleUrl,
  getManfithMapLocale,
} from "@/lib/maps/token"
import { logMapDiagnostics } from "@/lib/maps/diagnostics"

export {
  getManfithAccessToken,
  isManfithMapConfigured,
  getManfithStyleUrl,
  getManfithMapLocale,
  loadManfithMapSdk,
  resetManfithMapSdkForTests,
  initializeMap,
  fitBounds,
  animateTo,
  addDefaultControls,
  createMarker,
  attachPopup,
  addClusterLayer,
  removeClusterLayer,
  pointsToGeoJson,
  setRouteLine,
  removeRouteLine,
  logMapDiagnostics,
}

export function getManfithEnvSummary() {
  return {
    engine: import.meta.env.VITE_MAP_ENGINE ?? "",
    apiBase: import.meta.env.VITE_MANFITH_MAP_API_BASE ?? "",
    hasPublicToken: Boolean(getManfithAccessToken()),
    styleId: import.meta.env.VITE_MANFITH_MAP_STYLE_ID ?? "",
    vendorCloned: isManfithVendorCloned(),
  }
}

/** Backward-compatible alias */
export async function createMap(container, opts = {}) {
  return initializeMap(container, opts)
}

/** Stubs — Phase 2 enterprise */
export function createPolygon() {
  throw new Error("maps.createPolygon_not_implemented")
}

export function createCircleRadius() {
  throw new Error("maps.createCircleRadius_not_implemented")
}
