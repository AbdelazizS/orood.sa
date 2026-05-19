/**
 * Absolute URL to a wholesale product (Web Share, copy link, social).
 */
export function getWholesaleProductPageUrl(productId) {
  if (typeof window === "undefined" || !productId) return ""
  const base = window.location.origin.replace(/\/$/, "")
  return `${base}/wholesale/product/${productId}`
}

export function buildWholesaleShareText({ productTitle, productId, lang = "ar" }) {
  const url = getWholesaleProductPageUrl(productId)
  const title = productTitle?.trim() || ""
  if (lang === "ar") {
    return title ? `عروض الجملة: ${title}\n${url}` : url
  }
  return title ? `Wholesale: ${title}\n${url}` : url
}

/** Invite link is only meaningful while the group can still accept participants. */
export function isWholesaleShareable(product) {
  if (!product?.id) return false
  if (product.campaign_completed) return false
  if (Number(product.remaining_needed ?? 0) <= 0) return false
  const expiresAt = product.wholesale_expires_at
  if (expiresAt && !Number.isNaN(Date.parse(expiresAt))) {
    if (new Date(expiresAt).getTime() < Date.now()) return false
  }
  return true
}
