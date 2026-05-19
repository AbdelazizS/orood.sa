const PREFIX = "orood.branding."

export function readBrandingCache(locale) {
  if (typeof window === "undefined") return undefined
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${locale}`)
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

export function writeBrandingCache(locale, data) {
  if (typeof window === "undefined" || !data) return
  try {
    sessionStorage.setItem(`${PREFIX}${locale}`, JSON.stringify(data))
  } catch {
    // ignore quota errors
  }
}
