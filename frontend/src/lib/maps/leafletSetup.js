import L from "leaflet"
import "leaflet/dist/leaflet.css"
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"

let configured = false

/** Run once — fixes Vite asset paths and avoids breaking Default icon on repeat imports. */
export function ensureLeafletDefaults() {
  if (configured) return L
  configured = true
  if (L.Icon.Default.prototype._getIconUrl) {
    delete L.Icon.Default.prototype._getIconUrl
  }
  L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
  })
  return L
}

export function createDefaultPinIcon() {
  ensureLeafletDefaults()
  return new L.Icon.Default()
}

export function createPropertyPinIcon() {
  ensureLeafletDefaults()
  return L.divIcon({
    className: "map-marker map-marker--property",
    html: '<span class="map-marker-pin map-marker-pin--property" aria-hidden="true"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

export { L }
