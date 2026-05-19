import apiClient from "@/lib/apiClient"
import { getManfithAccessToken } from "@/lib/maps/token"

/**
 * Reverse geocode via Mapbox Geocoding API (Manfith engine).
 */
function parseMapboxFeature(feature) {
  if (!feature) return null
  const placeName =
    typeof feature.place_name === "string" && feature.place_name.trim()
      ? feature.place_name.trim()
      : null

  let cityName = null
  let regionName = null

  for (const ctx of feature.context ?? []) {
    const id = String(ctx?.id ?? "")
    const text = typeof ctx?.text === "string" ? ctx.text.trim() : ""
    if (!text) continue
    if (id.startsWith("place.") || id.startsWith("locality.")) {
      cityName = cityName || text
    }
    if (id.startsWith("region.")) {
      regionName = text
    }
  }

  const types = feature.place_type ?? []
  if (!cityName && types.includes("place") && typeof feature.text === "string") {
    cityName = feature.text.trim()
  }

  return { placeName, cityName, regionName }
}

/**
 * Reverse geocode via Mapbox — full address string.
 */
export async function mapboxReverseGeocode(lat, lng, signal, language = "ar") {
  const detailed = await mapboxReverseGeocodeDetailed(lat, lng, signal, language)
  return detailed?.placeName ?? null
}

/**
 * Reverse geocode via Mapbox — address + city/locality + region labels.
 */
export async function mapboxReverseGeocodeDetailed(lat, lng, signal, language = "ar") {
  const token = getManfithAccessToken()
  if (!token) return null
  const lang = String(language).toLowerCase().startsWith("ar") ? "ar" : "en"
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(lng)},${encodeURIComponent(lat)}.json`
  )
  url.searchParams.set("access_token", token)
  url.searchParams.set("language", lang)
  url.searchParams.set("limit", "1")
  url.searchParams.set("types", "address,place,locality,neighborhood")
  try {
    const res = await fetch(url.toString(), { signal })
    if (!res.ok) return null
    const data = await res.json()
    return parseMapboxFeature(data?.features?.[0]) ?? null
  } catch {
    return null
  }
}

/**
 * Forward geocode (address search) via Mapbox Geocoding API.
 */
export async function mapboxForwardGeocode(query, signal, language = "ar") {
  const token = getManfithAccessToken()
  const q = String(query || "").trim()
  if (!token || q.length < 2) return []
  const lang = String(language).toLowerCase().startsWith("ar") ? "ar" : "en"
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
  )
  url.searchParams.set("access_token", token)
  url.searchParams.set("language", lang)
  url.searchParams.set("limit", "5")
  url.searchParams.set("country", "sa")
  try {
    const res = await fetch(url.toString(), { signal })
    if (!res.ok) return []
    const data = await res.json()
    return (data?.features ?? [])
      .map((f) => {
        const [lng, lat] = f.center ?? []
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        return {
          label: f.place_name ?? "",
          lat,
          lng,
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Forward geocode via Laravel Nominatim proxy (never call Nominatim from the browser).
 * @returns {Promise<Array<{ label: string, lat: number, lng: number }>>}
 */
export async function proxyForwardGeocode(query, signal, language = "ar") {
  const q = String(query || "").trim()
  if (q.length < 2) return []
  const lang = String(language).toLowerCase().startsWith("ar") ? "ar" : "en"
  try {
    const { data } = await apiClient.get("/maps/geocode/search", {
      params: { q, lang },
      signal,
    })
    const list = data?.data
    return Array.isArray(list) ? list : []
  } catch (err) {
    if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") throw err
    throw err
  }
}

/**
 * Unified place search: Mapbox when token is available, else backend Nominatim proxy.
 * @returns {Promise<Array<{ label: string, lat: number, lng: number }>>}
 */
export async function searchPlaces(query, signal, language = "ar") {
  const q = String(query || "").trim()
  if (q.length < 2) return []

  if (getManfithAccessToken()) {
    const mapboxResults = await mapboxForwardGeocode(q, signal, language)
    if (mapboxResults.length > 0) return mapboxResults
  }

  return proxyForwardGeocode(q, signal, language)
}

/**
 * Reverse geocode via Laravel Nominatim proxy.
 * @returns {Promise<{ placeName: string|null, cityName: string|null, regionName: string|null }|null>}
 */
export async function proxyReverseGeocodeDetailed(lat, lng, signal, language = "ar") {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const lang = String(language).toLowerCase().startsWith("ar") ? "ar" : "en"
  try {
    const { data } = await apiClient.get("/maps/geocode/reverse", {
      params: { lat, lng, lang },
      signal,
    })
    return data?.data ?? null
  } catch (err) {
    if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") throw err
    return null
  }
}

/**
 * Unified reverse geocode: Mapbox when token is available, else backend proxy.
 */
export async function reversePlace(lat, lng, signal, language = "ar") {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  if (getManfithAccessToken()) {
    const detail = await mapboxReverseGeocodeDetailed(lat, lng, signal, language)
    if (detail) return detail
  }

  return proxyReverseGeocodeDetailed(lat, lng, signal, language)
}

/**
 * Reverse geocode via Nominatim — address + city/locality + region.
 */
export async function nominatimReverseGeocodeDetailed(lat, lng, signal, attempt = 0) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse")
  url.searchParams.set("format", "json")
  url.searchParams.set("lat", String(lat))
  url.searchParams.set("lon", String(lng))
  url.searchParams.set("addressdetails", "1")
  url.searchParams.set("accept-language", "ar,en")
  try {
    const res = await fetch(url.toString(), {
      signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "AroothMarketplace/1.0 (maps)",
      },
    })
    if (!res.ok) {
      if (attempt < 1 && !signal.aborted) {
        await new Promise((r) => setTimeout(r, 1000))
        return nominatimReverseGeocodeDetailed(lat, lng, signal, attempt + 1)
      }
      return null
    }
    const data = await res.json()
    const placeName =
      typeof data?.display_name === "string" && data.display_name.trim()
        ? data.display_name.trim()
        : null
    const addr = data?.address ?? {}
    const cityName =
      addr.city || addr.town || addr.village || addr.municipality || addr.county || null
    const regionName = addr.state || addr.region || null
    if (!placeName && !cityName) return null
    return {
      placeName,
      cityName: cityName ? String(cityName) : null,
      regionName: regionName ? String(regionName) : null,
    }
  } catch {
    if (attempt < 1 && !signal.aborted) {
      await new Promise((r) => setTimeout(r, 1000))
      return nominatimReverseGeocodeDetailed(lat, lng, signal, attempt + 1)
    }
    return null
  }
}

/**
 * Reverse geocode via Nominatim (OSM). Respect usage policy; User-Agent identifies the app.
 */
export async function nominatimReverseGeocode(lat, lng, signal, attempt = 0) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse")
  url.searchParams.set("format", "json")
  url.searchParams.set("lat", String(lat))
  url.searchParams.set("lon", String(lng))
  url.searchParams.set("accept-language", "ar,en")
  try {
    const res = await fetch(url.toString(), {
      signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "AroothMarketplace/1.0 (maps)",
      },
    })
    if (!res.ok) {
      if (attempt < 1 && !signal.aborted) {
        await new Promise((r) => setTimeout(r, 1000))
        return nominatimReverseGeocode(lat, lng, signal, attempt + 1)
      }
      return null
    }
    const data = await res.json()
    const label = data?.display_name
    return typeof label === "string" && label.trim() ? label.trim() : null
  } catch {
    if (attempt < 1 && !signal.aborted) {
      await new Promise((r) => setTimeout(r, 1000))
      return nominatimReverseGeocode(lat, lng, signal, attempt + 1)
    }
    return null
  }
}

export { searchPlaces as forwardGeocode }
