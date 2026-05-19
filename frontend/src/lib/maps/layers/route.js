const ROUTE_SOURCE = "orood-route"
const ROUTE_LAYER = "orood-route-line"

/**
 * Draw a static line between two points on a Mapbox map.
 * @param {import('mapbox-gl').Map} map
 * @param {{ lat: number, lng: number }} from
 * @param {{ lat: number, lng: number }} to
 */
export function setRouteLine(map, from, to) {
  if (!map) return
  removeRouteLine(map)

  const fromOk = Number.isFinite(from?.lat) && Number.isFinite(from?.lng)
  const toOk = Number.isFinite(to?.lat) && Number.isFinite(to?.lng)
  if (!fromOk || !toOk) return

  const geojson = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
    },
  }

  const add = () => {
    if (map.getSource(ROUTE_SOURCE)) return
    map.addSource(ROUTE_SOURCE, { type: "geojson", data: geojson })
    map.addLayer({
      id: ROUTE_LAYER,
      type: "line",
      source: ROUTE_SOURCE,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#2563eb",
        "line-width": 3,
        "line-opacity": 0.75,
        "line-dasharray": [2, 1.5],
      },
    })
  }

  if (map.isStyleLoaded()) add()
  else map.once("load", add)
}

export function removeRouteLine(map) {
  if (!map) return
  try {
    if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER)
    if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE)
  } catch {
    /* map may be destroyed */
  }
}
