import { OTHER_SUBCATEGORY_KEY } from "@/lib/listings/subcategoryDerivedFields"

/**
 * Build flat listing_attributes for the add/edit form from API listing payload.
 */

const AMENITY_SWITCH_KEYS = [
  "parking",
  "elevator",
  "pool",
  "garden",
  "internet",
  "electricity",
  "water",
  "kitchen",
  "air_conditioning",
  "security",
]

const REAL_ESTATE_SCALAR_KEYS = [
  "purpose",
  "property_type",
  "area_sqm",
  "bedrooms",
  "bathrooms",
  "land_width_m",
  "land_length_m",
  "street_width_m",
  "property_age_years",
  "property_direction",
  "furnished",
  "floor_number",
  "total_floors",
]

function coerceAttributeValue(val) {
  if (val === true || val === false || val === null) return val
  if (val === "true" || val === "1" || val === 1) return true
  if (val === "false" || val === "0" || val === 0) return false
  if (typeof val === "string") {
    const trimmed = val.trim()
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        return JSON.parse(trimmed)
      } catch {
        return val
      }
    }
  }
  if (Array.isArray(val)) return val
  return val
}

/**
 * @param {Record<string, unknown>|null|undefined} flat
 */
export function normalizeListingAttributes(flat) {
  if (!flat || typeof flat !== "object" || Array.isArray(flat)) return {}
  const out = {}
  for (const [key, raw] of Object.entries(flat)) {
    if (!key) continue
    out[key] = coerceAttributeValue(raw)
  }
  return out
}

/**
 * Legacy product_real_estate_details → flat schema attribute keys (switches for amenities).
 * @param {Record<string, unknown>|null|undefined} realEstate
 */
export function attributesFromRealEstate(realEstate) {
  if (!realEstate || typeof realEstate !== "object") return {}

  const out = {}
  for (const key of REAL_ESTATE_SCALAR_KEYS) {
    const val = realEstate[key]
    if (val !== undefined && val !== null && val !== "") {
      out[key] = coerceAttributeValue(val)
    }
  }

  const amenities = realEstate.amenities
  if (Array.isArray(amenities)) {
    for (const item of amenities) {
      const k = typeof item === "string" ? item.trim() : ""
      if (k && AMENITY_SWITCH_KEYS.includes(k)) {
        out[k] = true
      }
    }
  }

  return out
}

/**
 * @param {Record<string, unknown>|null|undefined} product
 */
export function listingAttributesFromProduct(product) {
  const fromLegacy = attributesFromRealEstate(product?.real_estate)

  const flat = product?.listing_attributes
  let fromFlat = {}
  if (flat && typeof flat === "object" && !Array.isArray(flat) && Object.keys(flat).length > 0) {
    fromFlat = normalizeListingAttributes(flat)
  } else {
    const sections = product?.listing_attribute_sections
    if (Array.isArray(sections) && sections.length > 0) {
      const map = {}
      for (const section of sections) {
        for (const field of section.fields ?? []) {
          const key = field?.field_key
          if (!key) continue
          if (field.value !== undefined && field.value !== null && field.value !== "") {
            map[key] = field.value
            continue
          }
          if (field.field_type === "switch" || field.field_type === "checkbox") {
            const raw = field.value ?? field.display_value
            if (raw === true || raw === "true" || raw === 1 || raw === "1") {
              map[key] = true
            } else if (raw === false || raw === "false" || raw === 0 || raw === "0") {
              map[key] = false
            } else if (typeof raw === "string" && (raw === "نعم" || raw.toLowerCase() === "yes")) {
              map[key] = true
            }
          }
        }
      }
      fromFlat = normalizeListingAttributes(map)
    }
  }

  return normalizeListingAttributes({ ...fromLegacy, ...fromFlat })
}

/**
 * @param {Record<string, unknown>|null|undefined} product
 */
export function hydrateListingFormState(product) {
  if (!product) return null

  const ship = product.shipping_details ?? {}
  const cp = product.contact_preferences ?? {}
  const cover = product.media?.image_url
  const gallery = Array.isArray(product.media?.gallery) ? product.media.gallery : []
  const urls = [...new Set([...(cover ? [cover] : []), ...gallery].filter(Boolean))]

  const priceNum = product.price != null ? Number(product.price) : null

  return {
    type: product.type === "request" ? "request" : "offer",
    title: product.title ?? "",
    description: product.description ?? "",
    imageUrls: urls,
    priceEnabled: priceNum != null && Number.isFinite(priceNum) && priceNum > 0,
    price: priceNum != null && Number.isFinite(priceNum) && priceNum > 0 ? String(product.price) : "",
    categoryId: product.category?.id ?? null,
    subcategoryId: product.subcategory_other
      ? OTHER_SUBCATEGORY_KEY
      : product.subcategory?.id ?? null,
    subcategoryOther: product.subcategory_other ?? "",
    regionId: product.region?.id ?? null,
    cityId: product.city?.id ?? null,
    bidEnabled: !!product.accept_bids,
    bidVisible: product.bids_visible !== false,
    freeShipping: !!(product.free_shipping ?? ship.free_shipping),
    freeReturn: !!(product.free_return ?? ship.free_return),
    returnDays: String(product.free_return_days ?? ship.return_days ?? product.return_days ?? 1),
    showComments: product.show_comments !== false,
    allowViewLocation: !!(product.view_at_location ?? ship.view_at_client),
    contactMessages: cp.messages !== false,
    contactPhone: !!(cp.phone ?? product.contact_by_call),
    contactPhoneNumber: String(cp.phone_number ?? product.contact_phone ?? "").trim(),
    propertyLat: product.location_lat ?? null,
    propertyLng: product.location_lng ?? null,
    propertyAddress: product.location_address ?? "",
    listingAttributes: listingAttributesFromProduct(product),
  }
}
