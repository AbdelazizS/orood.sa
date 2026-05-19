/**
 * Maps public profile API payload + optional auth user into the shape expected by
 * dashboard profile feature components (ProfileHeader, ProfileStats, etc.).
 */

/**
 * Use homepage/feed listing as-is, or map legacy ListingCardResource rows for {@link ProductCard}.
 * @param {Record<string, unknown>} listing
 * @param {string} [sellerName]
 */
export function normalizeListingForProductCard(listing, sellerName = "") {
  if (!listing || typeof listing !== "object") return listing
  if (listing.stats && typeof listing.stats === "object" && "views" in listing.stats) {
    return listing
  }
  return listingCardToProduct(listing, { sellerName })
}

/**
 * Normalize a listing card from profile APIs (ListingCardResource) into the shape
 * expected by {@link import("@/components/feed/cards/ProductCard.jsx") ProductCard}.
 * @param {Record<string, unknown>} card
 * @param {{ sellerName?: string }} [options]
 */
export function listingCardToProduct(card, options = {}) {
  if (!card || typeof card !== "object") return card
  const sellerName = options.sellerName?.trim?.() || options.sellerName || ""
  const thumb = card.thumbnail
  const imageUrl =
    typeof thumb === "string"
      ? thumb
      : thumb && typeof thumb === "object" && "url" in thumb
        ? String(thumb.url ?? "")
        : ""
  const stats = card.stats && typeof card.stats === "object" ? card.stats : {}
  const views = Number(stats.view_count ?? stats.views ?? 0)
  const messages = Number(stats.message_count ?? stats.messages ?? stats.comments ?? 0)
  const city = card.city && typeof card.city === "object" ? card.city : null
  const location = typeof card.city === "string" ? card.city : city?.name ?? ""

  const gallery = imageUrl ? [imageUrl] : []

  return {
    ...card,
    published_at: card.bumped_at ?? card.published_at ?? card.created_at ?? null,
    location: location || undefined,
    seller: sellerName ? { name: sellerName } : card.seller,
    stats: {
      ...stats,
      views,
      messages,
    },
    media:
      card.media && typeof card.media === "object" && (card.media.image_url || card.media.gallery)
        ? {
            ...card.media,
            image_url: card.media.image_url ?? (imageUrl || undefined),
            gallery: Array.isArray(card.media.gallery) && card.media.gallery.length ? card.media.gallery : gallery,
          }
        : {
            image_url: imageUrl || undefined,
            gallery,
          },
  }
}

export function normalizeDashboardProfile(payload, authUser = null) {
  if (!payload) return null
  const u = payload.user ?? payload
  const listingsRaw = Array.isArray(payload.listings) ? payload.listings : []
  const reviews = Array.isArray(payload.reviews) ? payload.reviews : []
  const summary = payload.review_summary ?? {}
  const city =
    typeof u.city === "string"
      ? { name: u.city, id: u.city_id ?? null, region: u.region ? { name: u.region } : null }
      : u.city

  const sellerLabel = [u.username, u.name].map((s) => (typeof s === "string" ? s.trim() : "")).find(Boolean) || ""

  return {
    ...payload,
    ...u,
    id: u.id,
    name: u.name ?? authUser?.name ?? u.username,
    username: u.username,
    bio: u.bio ?? null,
    email: u.email ?? authUser?.email ?? "",
    email_verified: u.email_verified ?? authUser?.email_verified ?? u.is_verified,
    avatar_url: u.avatar_url,
    cover_photo_url: u.cover_photo_url ?? u.cover_url ?? null,
    logo_url: u.logo_url ?? u.avatar_url,
    city,
    city_id: u.city_id ?? city?.id ?? null,
    location_lat: u.location_lat ?? null,
    location_lng: u.location_lng ?? null,
    location_address: u.location_address ?? null,
    listings: listingsRaw.map((c) => normalizeListingForProductCard(c, sellerLabel)),
    reviews,
    reviews_avg: Number(summary.average ?? u.rating ?? 0),
    reviews_count: Number(summary.total ?? u.total_ratings ?? 0),
    listings_count: Number(u._count?.listings ?? listingsRaw.length),
    sold_items: Number(u.sold_items ?? 0),
    active_listings: Number(u.active_listings ?? u._count?.listings ?? listingsRaw.length),
    financial_guarantee: Number(u.financial_guarantee ?? 0),
    is_verified: Boolean(u.is_verified),
  }
}
