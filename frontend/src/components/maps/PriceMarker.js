import { formatShortPrice } from "@/lib/formatShortPrice"

export const MARKETING_AWAITING = "awaiting_marketer"

/** True when the marker is a listing still waiting for a marketer (grey pin, whether or not the viewer may see the price). */
export function isAwaitingMarker(marker) {
  return marker?.marketing_status === MARKETING_AWAITING
}

/**
 * Text shown inside a price pin: short price, or "انتظار" for awaiting listings.
 * @param {{ price?: number|string|null, marketing_status?: string|null }} marker
 * @param {(key: string, fallback: string) => string} t
 * @param {string} lang
 */
export function priceMarkerLabel(marker, t, lang) {
  if (marker?.pin_label) return String(marker.pin_label)
  if (isAwaitingMarker(marker)) return t("listingsMap.awaitingPin", "انتظار")
  return formatShortPrice(marker?.price, lang) || t("listingsMap.noPrice", "على السوم")
}

/**
 * Builds the DOM element for an Aqar-style price pin (used as a Mapbox marker element or Leaflet divIcon html).
 * @param {object} marker listing marker from /listings/map
 * @param {{ t: Function, lang: string, onSelect?: (marker: object) => void }} opts
 * @returns {HTMLButtonElement}
 */
export function buildPriceMarkerElement(marker, { t, lang, onSelect } = {}) {
  const awaiting = isAwaitingMarker(marker)
  const el = document.createElement("button")
  el.type = "button"
  el.className = awaiting ? "map-price-pin map-price-pin--awaiting" : "map-price-pin"
  el.dataset.listingId = String(marker.id)
  el.textContent = priceMarkerLabel(marker, t, lang)
  el.setAttribute("aria-label", `${marker.title ?? ""} — ${el.textContent}`)

  if (typeof onSelect === "function") {
    el.addEventListener("click", (e) => {
      e.stopPropagation()
      onSelect(marker)
    })
  }

  return el
}

/** Toggle the selected state on a pin element. */
export function setPriceMarkerActive(el, active) {
  if (!el) return
  el.classList.toggle("is-active", Boolean(active))
}
