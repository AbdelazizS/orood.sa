/**
 * @param {import('mapbox-gl').Map} map
 * @param {typeof import('mapbox-gl')} mapboxgl
 * @param {{ navigation?: boolean, geolocate?: boolean, fullscreen?: boolean }} [opts]
 */
export function addDefaultControls(map, mapboxgl, opts = {}) {
  const { navigation = true, geolocate = false, fullscreen = false } = opts
  if (navigation) {
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right")
  }
  if (geolocate && mapboxgl.GeolocateControl) {
    map.addControl(
      new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
      "top-right"
    )
  }
  if (fullscreen && mapboxgl.FullscreenControl) {
    map.addControl(new mapboxgl.FullscreenControl(), "top-right")
  }
}
