/** Default slug from backend config/listings.php seed (`Real Estate` → real-estate). */
const FALLBACK_REAL_ESTATE_SLUGS = ["real-estate"]

export function isRealEstateCategorySlug(slug) {
  if (!slug || typeof slug !== "string") return false
  return FALLBACK_REAL_ESTATE_SLUGS.includes(slug.trim().toLowerCase())
}

export function isRealEstateHomeFilter(categoryId, categories) {
  if (categoryId == null || !Array.isArray(categories)) return false
  const id = Number(categoryId)
  if (!Number.isFinite(id)) return false
  const c = categories.find((x) => Number(x?.id) === id)
  return isRealEstateCategorySlug(c?.slug)
}

/** Add-listing: true when main category is real estate. */
export function isRealEstateCategorySelection(categoryId, mainCategories) {
  return isRealEstateHomeFilter(categoryId, mainCategories)
}

export function isRealEstateListing(product) {
  if (!product) return false
  if (typeof product.is_real_estate === "boolean") return product.is_real_estate
  if (isRealEstateCategorySlug(product.category?.slug)) return true
  if (isRealEstateCategorySlug(product.subcategory?.category?.slug)) return true
  return false
}
