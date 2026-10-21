export const EMPTY_SUBSCRIBER_FILTERS = { regionId: null, cityId: null, propertyType: null }

/** API params from the subscriber filter state. */
export function subscriberFilterParams(f) {
  return { city_id: f.cityId, property_type: f.propertyType }
}

/** "1,500,000 ريال", or null when there is no usable price. */
export function formatFullPrice(value, t) {
  const n = Number(value)
  if (value == null || value === "" || !Number.isFinite(n) || n <= 0) return null
  return `${Math.round(n).toLocaleString("en-US")} ${t("common.currency", "ريال")}`
}
