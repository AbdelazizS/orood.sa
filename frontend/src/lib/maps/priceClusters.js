/** Shared clustering settings for the listings price map (Leaflet + Mapbox). */

/** Up to this zoom nearby listings are grouped; a group that still can't split opens as a list. */
export const PRICE_CLUSTER_MAX_ZOOM = 16

/** Grouping radius in screen pixels — roughly one price pin wide, so pins never overlap. */
export const PRICE_CLUSTER_RADIUS = 56

export const PRICE_CLUSTER_COLOR = "#2e7d4f"

/** Bubble diameter (px) for a cluster of `count` listings. */
export function clusterBubbleSize(count) {
  if (count >= 100) return 52
  if (count >= 25) return 46
  if (count >= 10) return 40
  return 34
}
