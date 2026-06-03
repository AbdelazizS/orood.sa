/**
 * Maps /api/v1/seo/resolve payload to SeoHead props (including OG image).
 */
export function seoHeadFromResolved(seo, overrides = {}) {
  if (!seo && !Object.keys(overrides).length) return overrides

  return {
    title: seo?.seo_title ?? seo?.title ?? overrides.title,
    description: seo?.description ?? overrides.description,
    keywords: seo?.keywords ?? overrides.keywords,
    hreflang: seo?.hreflang ?? overrides.hreflang,
    jsonLd: seo?.json_ld?.length ? seo.json_ld : overrides.jsonLd,
    image: seo?.og?.image ?? overrides.image,
    useTitleAsFull: Boolean(seo?.title ?? seo?.seo_title ?? overrides.useTitleAsFull),
    ...overrides,
  }
}
