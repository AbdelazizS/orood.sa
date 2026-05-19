import { isManfithMapConfigured } from "@/lib/maps/token"
import { getRuntimeMapEngine } from "@/lib/maps/runtimeConfig"

function envMapEngine() {
  return import.meta.env.VITE_MAP_ENGINE?.trim().toLowerCase() ?? ""
}

/**
 * Active map stack: legacy (Google/OSM Leaflet) vs manfith (Mapbox GL).
 * Auto-enables Mapbox when a public token exists (env or /maps/config),
 * unless VITE_MAP_PROVIDER=osm forces Leaflet (unless VITE_MAP_ENGINE=manfith/mapbox).
 */
export function resolveMapEngine() {
  const envEngine = envMapEngine()
  const runtime = getRuntimeMapEngine()
  const mapProvider = import.meta.env.VITE_MAP_PROVIDER?.trim().toLowerCase()

  if (envEngine === "osm" || envEngine === "leaflet" || envEngine === "legacy") return "legacy"
  if (envEngine === "manfith" || envEngine === "mapbox") return "manfith"

  if (
    mapProvider === "osm" &&
    envEngine !== "manfith" &&
    envEngine !== "mapbox"
  ) {
    return "legacy"
  }

  const raw = envEngine || runtime || ""
  if (raw === "osm" || raw === "leaflet" || raw === "legacy") return "legacy"
  if (raw === "manfith" || raw === "mapbox") return "manfith"

  if (isManfithMapConfigured()) return "manfith"
  return "legacy"
}

/** User explicitly set VITE_MAP_ENGINE=manfith (show dev hint if token still missing). */
export function isManfithEngineExplicitlyRequested() {
  const raw = envMapEngine()
  return raw === "manfith" || raw === "mapbox"
}

/** Manfith / Mapbox stack is active (token from env or API). */
export function isManfithEngineActive() {
  return resolveMapEngine() === "manfith" && isManfithMapConfigured()
}

export function isManfithEngineRequested() {
  return resolveMapEngine() === "manfith"
}

export function resolveMapProvider() {
  const raw = import.meta.env.VITE_MAP_PROVIDER?.trim().toLowerCase()
  if (raw === "osm") return "osm"
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  if (raw === "google") return key ? "google" : "osm"
  return key ? "google" : "osm"
}

/** Runtime stack: mapbox (Manfith) | google | osm */
export function resolveActiveStack() {
  if (isManfithEngineActive()) return "mapbox"
  if (resolveMapProvider() === "google") return "google"
  return "osm"
}
