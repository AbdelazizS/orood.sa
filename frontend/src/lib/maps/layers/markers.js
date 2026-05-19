/**
 * @param {typeof import('mapbox-gl')} mapboxgl
 * @param {import('mapbox-gl').Map} map
 * @param {{ lat: number, lng: number, draggable?: boolean, variant?: 'default'|'property'|'delivery' }} opts
 */
export function createMarker(mapboxgl, map, opts) {
  const { lat, lng, draggable = false, variant = "default" } = opts
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const useCustom = variant === "property" || variant === "delivery"
  const marker = useCustom
    ? new mapboxgl.Marker({ element: buildVariantElement(variant), draggable })
    : new mapboxgl.Marker({ draggable })

  marker.setLngLat([lng, lat]).addTo(map)
  return marker
}

function buildVariantElement(variant) {
  const wrap = document.createElement("div")
  wrap.className = `map-marker map-marker--${variant}`
  const pin = document.createElement("span")
  pin.className = `map-marker-pin map-marker-pin--${variant}`
  pin.setAttribute("aria-hidden", "true")
  wrap.appendChild(pin)
  return wrap
}

/**
 * @param {typeof import('mapbox-gl')} mapboxgl
 * @param {import('mapbox-gl').Marker} marker
 * @param {{ label?: string, url?: string }} content
 */
export function attachPopup(mapboxgl, marker, content) {
  if (!content?.label) return
  const label = String(content.label)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
  const html = content.url
    ? `<a href="${String(content.url).replace(/"/g, "&quot;")}" class="text-primary underline">${label}</a>`
    : label
  const popup = new mapboxgl.Popup({ offset: 28, closeButton: false }).setHTML(html)
  marker.setPopup(popup)
}
