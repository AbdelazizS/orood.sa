/** Root font size used for px → rem conversion (matches typical browser default). */
export const BRANDING_REM_BASE = 16

/**
 * Convert a pixel number to a rem CSS length.
 * @param {number | null | undefined} px
 * @param {number} [base]
 * @returns {string | null}
 */
export function pxToRem(px, base = BRANDING_REM_BASE) {
  if (px == null || !Number.isFinite(px) || px <= 0) return null
  const rem = px / base
  const formatted =
    Math.abs(rem - Math.round(rem)) < 0.0001
      ? String(Math.round(rem))
      : rem.toFixed(4).replace(/\.?0+$/, "")
  return `${formatted}rem`
}

/**
 * Normalize API/fallback dimension strings to rem (pass-through rem/vw/%).
 * @param {string | number | null | undefined} value
 * @returns {string | undefined}
 */
export function toRemCss(value) {
  if (value == null || value === "") return undefined
  if (typeof value === "number") {
    return pxToRem(value) ?? undefined
  }
  const s = String(value).trim()
  if (!s) return undefined
  if (/^(auto|inherit|initial|unset)$/.test(s)) return s
  if (/rem$|em$|%$|vw$|vh$|vmin$|vmax$|ch$/.test(s)) return s
  if (s.endsWith("px")) {
    const n = parseFloat(s)
    return Number.isFinite(n) ? pxToRem(n) ?? undefined : s
  }
  const n = parseFloat(s)
  if (Number.isFinite(n) && /^\d+(\.\d+)?$/.test(s)) {
    return pxToRem(n) ?? undefined
  }
  return s
}

/** Navbar/mobile header caps (220px / 280px at 16px root). */
export const LOGO_HEADER_MAX_W_MOBILE = "13.75rem"
export const LOGO_HEADER_MAX_W_DESKTOP = "17.5rem"
export const LOGO_HEADER_MIN_W_MOBILE_PX = 220
export const LOGO_HEADER_MIN_W_DESKTOP_PX = 280
export const LOGO_HEADER_MIN_H_PX = 64

/**
 * Branding dimension with a minimum floor (px) so stale admin values cannot shrink the navbar logo.
 * @param {string | number | null | undefined} value
 * @param {number} floorPx
 * @returns {string | undefined}
 */
export function toRemCssWithFloor(value, floorPx) {
  const rem = toRemCss(value)
  const floorRem = pxToRem(floorPx)
  if (!floorRem) return rem
  if (!rem) return floorRem
  const n = parseFloat(rem)
  const floorN = parseFloat(floorRem)
  if (!Number.isFinite(n) || !Number.isFinite(floorN)) return rem
  return n < floorN ? floorRem : rem
}
