/** Profile slug blocklist — these are static site routes, not usernames. */
export const RESERVED_PUBLIC_PATHS = {
  help: "/help",
  contact: "/contact",
  about: "/about",
  terms: "/terms",
  "privacy-policy": "/privacy-policy",
  "refund-policy": "/refund-policy",
  "payment-policy": "/payment-policy",
  "listing-policy": "/listing-policy",
  safety: "/safety",
  fees: "/fees",
  services: "/?cat=services",
  wholesale: "/wholesale",
  add: "/add",
  login: "/login",
  register: "/register",
  map: "/map",
  "listings/map": "/listings/map",
}

export function reservedPathForProfileSlug(slug) {
  if (!slug) return null
  const key = String(slug).trim().toLowerCase()
  return RESERVED_PUBLIC_PATHS[key] ?? null
}
