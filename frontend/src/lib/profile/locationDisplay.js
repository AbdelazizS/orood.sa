/**
 * Public profile location line: prefer saved address when coords exist, else city name.
 */
export function getProfileLocationLine(user) {
  if (!user || typeof user !== "object") return null

  const lat = user.location_lat != null ? Number(user.location_lat) : null
  const lng = user.location_lng != null ? Number(user.location_lng) : null
  const hasCoords =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)

  const address =
    typeof user.location_address === "string" ? user.location_address.trim() : ""

  const city =
    typeof user.city === "string"
      ? user.city.trim()
      : user.city?.name
        ? String(user.city.name).trim()
        : ""

  if (hasCoords && address) return address
  if (city) return city
  if (address) return address
  return null
}

/** Profile heading: username, then legal/display name. */
export function getProfileDisplayName(user) {
  if (!user || typeof user !== "object") return ""
  return (
    [user.username, user.name]
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .find(Boolean) || ""
  )
}

export function normalizeLocationText(value) {
  if (value == null) return ""
  return String(value).trim().replace(/\s+/g, " ")
}

export function isRedundantLocationSubtitle(headerLine, subtitle) {
  const a = normalizeLocationText(headerLine)
  const b = normalizeLocationText(subtitle)
  if (!a || !b) return false
  return a === b
}

/** Company card duplicates hero when name matches, no product types, verified already on user. */
export function shouldHideRedundantCompanyCard(user, company) {
  if (!company?.name) return true

  const companyName = normalizeLocationText(company.name)
  const displayName = normalizeLocationText(getProfileDisplayName(user))
  if (!companyName || !displayName || companyName.toLowerCase() !== displayName.toLowerCase()) {
    return false
  }

  const types = Array.isArray(company.product_types) ? company.product_types.filter(Boolean) : []
  if (types.length > 0) return false

  if (company.is_verified && user?.is_verified) return true

  return false
}

export function getCompanyProductTypesLine(company) {
  const types = Array.isArray(company?.product_types) ? company.product_types.filter(Boolean) : []
  return types.join(" · ")
}
