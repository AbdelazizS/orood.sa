/**
 * Public profile URL: `/profile/:identifier` where identifier is username or numeric user id.
 */
export function publicProfilePath(userOrSeller) {
  if (!userOrSeller) return null
  const username = userOrSeller.username
  const id = userOrSeller.id
  if (username && String(username).trim()) return `/profile/${String(username).trim()}`
  if (id != null && String(id).match(/^\d+$/)) return `/profile/${id}`
  return null
}

export function isProfileIdentifierNumeric(identifier) {
  if (typeof identifier !== "string") return false
  const v = identifier.trim()
  return v.length > 0 && /^\d+$/.test(v)
}
