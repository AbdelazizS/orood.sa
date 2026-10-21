/**
 * Raster basemap tiles (OSM). Dark mode reuses the same keyless OSM tiles with a CSS filter
 * (`.map-tiles-dark` in index.css) — Carto's dark tiles now require an API key off localhost.
 */
export function getRasterTiles(isDark) {
  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    className: isDark ? "map-tiles-dark" : undefined,
  }
}
