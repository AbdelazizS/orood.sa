/** UI-only sentinel — not stored as a subcategory row. */
export const OTHER_SUBCATEGORY_KEY = "__other__"

const SLUG_SUFFIX_MAP = {
  apartments: "apartment",
  villas: "villa",
  land: "land",
  building: "building",
  buildings: "building",
  floor: "floor",
  floors: "floor",
  shop: "shop",
  shops: "shop",
  farm: "farm",
  farms: "farm",
}

export function isOtherSubcategorySelection(subcategoryId) {
  return String(subcategoryId ?? "") === OTHER_SUBCATEGORY_KEY
}

/**
 * @param {{ listing_property_type?: string|null, slug?: string|null }|null|undefined} subcategory
 * @returns {string|null}
 */
export function resolvePropertyTypeFromSubcategory(subcategory) {
  if (!subcategory) return null

  const explicit = subcategory.listing_property_type
  if (explicit && typeof explicit === "string") return explicit

  const slug = subcategory.slug
  if (!slug || typeof slug !== "string") return null

  const parts = slug.split("-")
  const suffix = parts[parts.length - 1]?.toLowerCase()
  return SLUG_SUFFIX_MAP[suffix] ?? null
}

/**
 * Schema field keys derived from subcategory selection (hidden on create/edit).
 * @param {{ isRealEstate?: boolean, subcategoryId?: string|number|null, subcategory?: object|null }} ctx
 * @returns {string[]}
 */
export function getHiddenSchemaFieldKeys({ isRealEstate, subcategoryId }) {
  if (isRealEstate && subcategoryId && !isOtherSubcategorySelection(subcategoryId)) {
    return ["property_type"]
  }
  return []
}
