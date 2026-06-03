import { realEstatePurposeLabel, realEstateTypeLabel } from "@/lib/realEstate/labels"

import { resolvePropertyTypeFromSubcategory } from "@/lib/listings/subcategoryDerivedFields"

const RE_ENUM_KEYS = {
  purpose: realEstatePurposeLabel,
  property_type: realEstateTypeLabel,
}

const YES_VALUES = new Set(["yes", "نعم", "true", "1"])

/**
 * @param {{ field_key?: string, label?: string }} row
 * @param {import("i18next").TFunction} t
 */
export function shouldHideRedundantListingField(row, product) {
  if (row?.field_key !== "property_type") return false
  const derived = resolvePropertyTypeFromSubcategory(product?.subcategory)
  if (!derived) return false
  const value = row?.value != null && row.value !== "" ? String(row.value) : ""
  return value === derived
}

export function resolveFieldLabel(row, t) {
  const key = row?.field_key
  if (!key) return ""

  const apiLabel = row.label?.trim()
  if (apiLabel && apiLabel !== key) return apiLabel

  const i18nKey = `listingSchema.fields.${key}`
  const translated = t(i18nKey, { defaultValue: key })
  if (translated !== key) return translated

  return key
}

/**
 * @param {{ field_key?: string, field_type?: string, value?: unknown, display_value?: string, options?: Array<{ value?: string, label?: string, label_ar?: string, label_en?: string }> }} row
 * @param {import("i18next").TFunction} t
 * @param {string} [locale]
 * @returns {string|null} null for chip-only switches
 */
export function resolveFieldValue(row, t, locale) {
  const fieldType = row?.field_type
  if (fieldType === "switch" || fieldType === "checkbox") {
    return null
  }

  const dv = row?.display_value
  if (dv != null && dv !== "" && !isYesNoDisplay(dv, t)) {
    return String(dv)
  }

  const fromOptions = resolveOptionLabel(row, locale)
  if (fromOptions) return fromOptions

  const reResolver = RE_ENUM_KEYS[row?.field_key]
  if (reResolver && row?.value != null && row.value !== "") {
    const label = reResolver(String(row.value), t)
    if (label && label !== String(row.value)) return label
  }

  const raw = row?.value
  if (raw === true || raw === "true" || raw === 1) return t("common.yes")
  if (raw === false || raw === "false" || raw === 0) return t("common.no")
  if (Array.isArray(raw)) return raw.join(t("common.listSeparator", "، "))

  return raw != null && raw !== "" ? String(raw) : ""
}

function isYesNoDisplay(value, t) {
  const s = String(value).trim().toLowerCase()
  return YES_VALUES.has(s) || s === String(t("common.yes")).toLowerCase()
}

function resolveOptionLabel(row, locale) {
  const raw = row?.value
  if (raw == null || raw === "") return null
  const options = row?.options
  if (!Array.isArray(options) || !options.length) return null

  const strVal = String(raw)
  const isEn = locale?.startsWith("en")
  for (const opt of options) {
    if (String(opt?.value ?? "") !== strVal) continue
    if (opt.label) return opt.label
    return isEn
      ? opt.label_en || opt.label_ar || strVal
      : opt.label_ar || opt.label_en || strVal
  }
  return null
}

export function isSwitchField(row) {
  return row?.field_type === "switch" || row?.field_type === "checkbox"
}

export function isActiveSwitch(row, t) {
  if (!isSwitchField(row)) return false
  const dv = row.display_value
  if (dv != null && dv !== "" && !isYesNoDisplay(dv, t) && dv !== t("common.no")) {
    return true
  }
  return row.value === true || row.value === "true" || row.value === 1
}

export function isTruthyAttributeValue(value) {
  if (value === true || value === "true" || value === 1) return true
  if (value === false || value === "false" || value === 0) return false
  return value != null && value !== ""
}

/** Known RE amenity keys when flat map has no schema sections */
const RE_AMENITY_KEYS = new Set([
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
])

/**
 * Split flat attributes object into specs + features sections for legacy fallback.
 * @param {Record<string, unknown>} attributes
 * @param {import("i18next").TFunction} t
 */
export function buildSectionsFromFlatAttributes(attributes, t) {
  if (!attributes || typeof attributes !== "object") return []

  const specRows = []
  const featureRows = []

  for (const [field_key, value] of Object.entries(attributes)) {
    if (!isTruthyAttributeValue(value)) continue

    const row = {
      field_key,
      label: field_key,
      value,
      field_type: RE_AMENITY_KEYS.has(field_key) || value === true ? "switch" : undefined,
    }

    if (RE_AMENITY_KEYS.has(field_key) || value === true) {
      featureRows.push(row)
    } else {
      specRows.push(row)
    }
  }

  const sections = []
  if (specRows.length) {
    sections.push({ key: "property_specs", title: t("listingSchema.sections.property_specs", "مواصفات العقار"), fields: specRows })
  }
  if (featureRows.length) {
    sections.push({ key: "features", title: t("listingSchema.sections.features", "المميزات"), fields: featureRows })
  }

  return sections
}
