export const MAP_PROPERTY_TYPES = ["apartment", "villa", "land", "building", "floor", "shop", "farm"]
export const STREET_WIDTH_OPTIONS = [10, 15, 20, 30, 40]

/** Count of active listings-map filters, for the badge on the "بحث" button. */
export function countActiveMapFilters(f) {
  return [f.rePropertyType, f.cityId, f.district, f.minPrice, f.maxPrice, f.streetWidthMin].filter(
    (v) => v !== null && v !== undefined && v !== "",
  ).length
}
