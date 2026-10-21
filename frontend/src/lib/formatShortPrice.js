/**
 * Short price label for map pins: 1_250_000 → "1.25 مليون", 850_000 → "850 ألف" ("1.25M" / "850K" in English).
 * @param {number|string|null|undefined} value
 * @param {string} [lang] i18n language ("ar" | "en")
 * @returns {string} empty string when there is no usable price
 */
export function formatShortPrice(value, lang = "ar") {
  const n = Number(value)
  if (value == null || value === "" || !Number.isFinite(n) || n <= 0) return ""

  const isEn = String(lang).toLowerCase().startsWith("en")
  const trim = (x) => {
    // Up to 2 decimals, no trailing zeros: 1.20 → "1.2", 850.00 → "850"
    const rounded = Math.round(x * 100) / 100
    return String(rounded)
  }

  if (n >= 1_000_000) {
    const v = trim(n / 1_000_000)
    return isEn ? `${v}M` : `${v} مليون`
  }
  if (n >= 1_000) {
    // 999_999 would round to "1000 ألف"; show it as millions instead.
    const k = Math.round((n / 1_000) * 10) / 10
    if (k >= 1000) return isEn ? "1M" : "1 مليون"
    return isEn ? `${trim(k)}K` : `${trim(k)} ألف`
  }
  return String(Math.round(n))
}
