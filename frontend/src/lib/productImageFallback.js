/** Category-aware placeholder when remote listing images fail to load. */
const CATEGORY_FALLBACKS = {
  "real-estate": "/logo.png",
  electronics: "/logo.png",
  clothing: "/logo.png",
  furniture: "/logo.png",
}

const DEFAULT_FALLBACK = "/logo.png"

export function getProductImageFallback(categorySlug) {
  if (!categorySlug || typeof categorySlug !== "string") return DEFAULT_FALLBACK
  return CATEGORY_FALLBACKS[categorySlug] ?? DEFAULT_FALLBACK
}
