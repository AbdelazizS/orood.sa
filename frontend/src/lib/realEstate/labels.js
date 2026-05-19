const PURPOSE_KEYS = { sale: "realEstate.purposeSale", rent: "realEstate.purposeRent" }
const TYPE_KEYS = {
  apartment: "realEstate.typeApartment",
  villa: "realEstate.typeVilla",
  land: "realEstate.typeLand",
  building: "realEstate.typeBuilding",
  floor: "realEstate.typeFloor",
  shop: "realEstate.typeShop",
  farm: "realEstate.typeFarm",
}

export function realEstatePurposeLabel(purpose, t) {
  if (!purpose) return ""
  return t(PURPOSE_KEYS[purpose] ?? purpose, purpose)
}

export function realEstateTypeLabel(propertyType, t) {
  if (!propertyType) return ""
  return t(TYPE_KEYS[propertyType] ?? propertyType, propertyType)
}

/** Compact chip line for cards: للبيع · 120م² · 3 غرف */
export function formatRealEstateCardMeta(realEstate, t) {
  if (!realEstate || typeof realEstate !== "object") return null
  const parts = []
  if (realEstate.purpose) parts.push(realEstatePurposeLabel(realEstate.purpose, t))
  if (realEstate.area_sqm) {
    parts.push(t("realEstate.areaSqm", { value: realEstate.area_sqm, defaultValue: "{{value}} م²" }))
  }
  if (realEstate.bedrooms != null) {
    parts.push(t("realEstate.rooms", { count: realEstate.bedrooms, defaultValue: "{{count}} غرف" }))
  }
  return parts.length ? parts.join(" · ") : null
}

export const DEFAULT_REAL_ESTATE_FORM = {
  purpose: "sale",
  property_type: "apartment",
  area_sqm: "",
  bedrooms: "",
  bathrooms: "",
  land_width_m: "",
  land_length_m: "",
  street_width_m: "",
  property_age_years: "",
  furnished: false,
  floor_number: "",
  total_floors: "",
  amenities: [],
}

export function realEstateFormToPayload(form) {
  const num = (v) => {
    if (v === "" || v == null) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return {
    purpose: form.purpose,
    property_type: form.property_type,
    area_sqm: num(form.area_sqm),
    bedrooms: num(form.bedrooms),
    bathrooms: num(form.bathrooms),
    land_width_m: num(form.land_width_m),
    land_length_m: num(form.land_length_m),
    street_width_m: num(form.street_width_m),
    property_age_years: num(form.property_age_years),
    furnished: !!form.furnished,
    floor_number: num(form.floor_number),
    total_floors: num(form.total_floors),
    amenities: Array.isArray(form.amenities) ? form.amenities : [],
  }
}

export function realEstateFromApi(re) {
  if (!re) return { ...DEFAULT_REAL_ESTATE_FORM }
  return {
    purpose: re.purpose ?? "sale",
    property_type: re.property_type ?? "apartment",
    area_sqm: re.area_sqm != null ? String(re.area_sqm) : "",
    bedrooms: re.bedrooms != null ? String(re.bedrooms) : "",
    bathrooms: re.bathrooms != null ? String(re.bathrooms) : "",
    land_width_m: re.land_width_m != null ? String(re.land_width_m) : "",
    land_length_m: re.land_length_m != null ? String(re.land_length_m) : "",
    street_width_m: re.street_width_m != null ? String(re.street_width_m) : "",
    property_age_years: re.property_age_years != null ? String(re.property_age_years) : "",
    furnished: !!re.furnished,
    floor_number: re.floor_number != null ? String(re.floor_number) : "",
    total_floors: re.total_floors != null ? String(re.total_floors) : "",
    amenities: re.amenities ?? [],
  }
}
