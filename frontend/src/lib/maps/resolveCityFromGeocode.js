/**
 * Normalize Arabic/Latin place names for fuzzy city matching.
 */
export function normalizePlaceName(value) {
  if (value == null) return ""
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
}

function cityLabelVariants(city) {
  if (!city || typeof city !== "object") return []
  return [city.name, city.name_ar, city.name_en]
    .filter((v) => typeof v === "string" && v.trim())
    .map((v) => normalizePlaceName(v))
}

/**
 * Match a geocoded city/locality name to a city id from /regions payload.
 * @param {string} cityName
 * @param {Array<{ cities?: Array<Record<string, unknown>> }>} regions
 * @returns {number|null}
 */
export function resolveCityIdFromName(cityName, regions) {
  const needle = normalizePlaceName(cityName)
  if (!needle || !Array.isArray(regions)) return null

  for (const region of regions) {
    for (const city of region.cities ?? []) {
      const id = city.id
      if (id == null) continue
      for (const variant of cityLabelVariants(city)) {
        if (!variant) continue
        if (variant === needle || variant.includes(needle) || needle.includes(variant)) {
          return Number(id)
        }
      }
    }
  }

  return null
}
