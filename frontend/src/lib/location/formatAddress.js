/**
 * Central address formatter — single source for display strings.
 * @param {{ address?: string, city?: string, region?: string, district?: string, lat?: number, lng?: number }} parts
 */
export function formatAddress(parts = {}) {
  const segments = []
  if (parts.address?.trim()) segments.push(parts.address.trim())
  if (parts.district?.trim()) segments.push(parts.district.trim())
  if (parts.city?.trim()) segments.push(parts.city.trim())
  if (parts.region?.trim() && parts.region !== parts.city) segments.push(parts.region.trim())

  if (segments.length > 0) return segments.join("، ")

  return ""
}
