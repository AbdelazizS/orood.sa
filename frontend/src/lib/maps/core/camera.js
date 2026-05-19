/**
 * @param {import('mapbox-gl').Map} map
 * @param {{ lat: number, lng: number }} center
 * @param {{ zoom?: number, duration?: number }} [opts]
 */
export function animateTo(map, center, opts = {}) {
  if (!map || !Number.isFinite(center?.lat) || !Number.isFinite(center?.lng)) return
  const duration = opts.duration ?? 450
  map.easeTo({
    center: [center.lng, center.lat],
    zoom: opts.zoom ?? Math.max(map.getZoom(), 13),
    duration,
  })
}

/**
 * @param {import('mapbox-gl').Map} map
 * @param {typeof import('mapbox-gl')} mapboxgl
 * @param {Array<[number, number]>} positions [lat, lng]
 * @param {{ padding?: number, maxZoom?: number, duration?: number }} [opts]
 */
export function fitBounds(map, mapboxgl, positions, opts = {}) {
  if (!map || !positions?.length) return
  const duration = opts.duration ?? 450
  if (positions.length === 1) {
    const [lat, lng] = positions[0]
    animateTo(map, { lat, lng }, { zoom: opts.maxZoom ?? 13, duration })
    return
  }
  const bounds = new mapboxgl.LngLatBounds()
  positions.forEach(([lat, lng]) => bounds.extend([lng, lat]))
  map.fitBounds(bounds, {
    padding: opts.padding ?? 40,
    maxZoom: opts.maxZoom ?? 14,
    duration,
  })
}
