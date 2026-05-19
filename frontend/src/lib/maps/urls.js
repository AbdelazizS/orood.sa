/**
 * External map URLs (no provider SDK required).
 * Google Maps uses the documented Search URL so the pin matches our lat/lng.
 */

const SA_LAT_MIN = 16
const SA_LAT_MAX = 33
const SA_LNG_MIN = 34
const SA_LNG_MAX = 57

function roundCoord(n) {
  return Math.round(Number(n) * 1e6) / 1e6
}

/**
 * Fix swapped lat/lng when values clearly belong to the other axis (common in SA).
 * @returns {{ lat: number, lng: number, swapped: boolean }}
 */
export function normalizeLatLng(lat, lng, { region = "sa" } = {}) {
  const la = Number(lat)
  const ln = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln)) {
    return { lat: la, lng: ln, swapped: false }
  }

  if (region !== "sa") {
    return { lat: roundCoord(la), lng: roundCoord(ln), swapped: false }
  }

  const inSaLat = la >= SA_LAT_MIN && la <= SA_LAT_MAX
  const inSaLng = ln >= SA_LNG_MIN && ln <= SA_LNG_MAX
  if (inSaLat && inSaLng) {
    return { lat: roundCoord(la), lng: roundCoord(ln), swapped: false }
  }

  const laLooksLikeLng = la >= SA_LNG_MIN && la <= SA_LNG_MAX
  const lnLooksLikeLat = ln >= SA_LAT_MIN && ln <= SA_LAT_MAX
  if (laLooksLikeLng && lnLooksLikeLat) {
    return { lat: roundCoord(ln), lng: roundCoord(la), swapped: true }
  }

  return { lat: roundCoord(la), lng: roundCoord(ln), swapped: false }
}

/**
 * Open exact coordinates in Google Maps (same pin as on our map).
 * @see https://developers.google.com/maps/documentation/urls/get-started#search-action
 */
export function googleMapsPlaceUrl(lat, lng, _label = "") {
  const { lat: nLat, lng: nLng } = normalizeLatLng(lat, lng)
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) {
    return "https://www.google.com/maps"
  }
  const params = new URLSearchParams({
    api: "1",
    query: `${nLat},${nLng}`,
  })
  return `https://www.google.com/maps/search/?${params.toString()}`
}

/** @deprecated Use googleMapsPlaceUrl — Apple Maps removed from product UI */
export function appleMapsPlaceUrl(lat, lng, label = "") {
  const { lat: nLat, lng: nLng } = normalizeLatLng(lat, lng)
  const q = label ? `${encodeURIComponent(label)}@${nLat},${nLng}` : `${nLat},${nLng}`
  return `https://maps.apple.com/?q=${q}`
}

export function geoUri(lat, lng) {
  const { lat: nLat, lng: nLng } = normalizeLatLng(lat, lng)
  return `geo:${nLat},${nLng}`
}

export function googleDirectionsUrl(destLat, destLng, opts = {}) {
  const { lat: dLat, lng: dLng } = normalizeLatLng(destLat, destLng)
  const { originLat, originLng } = opts
  const params = new URLSearchParams({ api: "1", destination: `${dLat},${dLng}` })
  if (originLat != null && originLng != null) {
    const { lat: oLat, lng: oLng } = normalizeLatLng(originLat, originLng)
    params.set("origin", `${oLat},${oLng}`)
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function appleDirectionsUrl(destLat, destLng) {
  const { lat: dLat, lng: dLng } = normalizeLatLng(destLat, destLng)
  const params = new URLSearchParams({ daddr: `${dLat},${dLng}` })
  return `https://maps.apple.com/?${params.toString()}`
}
