const CLUSTER_SOURCE = "orood-clusters"
const CLUSTER_LAYER = "orood-clusters-circles"
const CLUSTER_COUNT_LAYER = "orood-clusters-count"
const UNCLUSTERED_LAYER = "orood-clusters-point"

/**
 * @param {Array<{ id?: string|number, lat: number, lng: number, label?: string, url?: string }>} points
 */
export function pointsToGeoJson(points) {
  return {
    type: "FeatureCollection",
    features: points
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p, i) => ({
        type: "Feature",
        properties: {
          id: String(p.id ?? i),
          label: p.label ?? "",
          url: p.url ?? "",
        },
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      })),
  }
}

/**
 * Mapbox GL native clustering (supercluster under the hood).
 * @param {import('mapbox-gl').Map} map
 * @param {typeof import('mapbox-gl')} mapboxgl
 * @param {Array<{ id?: string|number, lat: number, lng: number, label?: string, url?: string }>} points
 */
export function addClusterLayer(map, mapboxgl, points) {
  const geojson = pointsToGeoJson(points)
  const popup = new mapboxgl.Popup({ closeButton: false, offset: 16 })

  const setup = () => {
    const existing = map.getSource(CLUSTER_SOURCE)
    if (existing) {
      existing.setData(geojson)
      if (geojson.features.length) {
        const bounds = new mapboxgl.LngLatBounds()
        geojson.features.forEach((f) => bounds.extend(f.geometry.coordinates))
        map.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 450 })
      }
      return
    }

    map.addSource(CLUSTER_SOURCE, {
      type: "geojson",
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    })

    map.addLayer({
      id: CLUSTER_LAYER,
      type: "circle",
      source: CLUSTER_SOURCE,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#2563eb",
        "circle-radius": ["step", ["get", "point_count"], 18, 10, 22, 50, 28],
        "circle-opacity": 0.88,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    })

    map.addLayer({
      id: CLUSTER_COUNT_LAYER,
      type: "symbol",
      source: CLUSTER_SOURCE,
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-size": 12,
      },
      paint: { "text-color": "#ffffff" },
    })

    map.addLayer({
      id: UNCLUSTERED_LAYER,
      type: "circle",
      source: CLUSTER_SOURCE,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": "#1d4ed8",
        "circle-radius": 8,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    })

    map.on("click", CLUSTER_LAYER, (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] })
      const clusterId = features[0]?.properties?.cluster_id
      if (clusterId == null) return
      const source = map.getSource(CLUSTER_SOURCE)
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return
        map.easeTo({ center: features[0].geometry.coordinates, zoom })
      })
    })

    map.on("click", UNCLUSTERED_LAYER, (e) => {
      const f = e.features?.[0]
      if (!f) return
      const [lng, lat] = f.geometry.coordinates
      const props = f.properties ?? {}
      if (props.label) {
        const label = String(props.label)
        const html = props.url
          ? `<a href="${props.url}" class="text-primary underline">${label}</a>`
          : label
        popup.setLngLat([lng, lat]).setHTML(html).addTo(map)
      }
    })

    ;[CLUSTER_LAYER, UNCLUSTERED_LAYER].forEach((layer) => {
      map.on("mouseenter", layer, () => {
        map.getCanvas().style.cursor = "pointer"
      })
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = ""
      })
    })

    if (geojson.features.length) {
      const bounds = new mapboxgl.LngLatBounds()
      geojson.features.forEach((f) => bounds.extend(f.geometry.coordinates))
      map.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 450 })
    }
  }

  if (map.isStyleLoaded()) setup()
  else map.once("load", setup)

  return () => removeClusterLayer(map)
}

export function removeClusterLayer(map) {
  if (!map) return
  const layers = [CLUSTER_COUNT_LAYER, UNCLUSTERED_LAYER, CLUSTER_LAYER]
  try {
    layers.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id)
    })
    if (map.getSource(CLUSTER_SOURCE)) map.removeSource(CLUSTER_SOURCE)
  } catch {
    /* map destroyed */
  }
}
