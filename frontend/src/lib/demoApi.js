/**
 * Mock API responses for demo mode.
 * Used when VITE_USE_DEMO=true (standalone frontend without backend).
 */
import {
  DEMO_CATEGORIES,
  DEMO_REGIONS,
  DEMO_PRODUCTS,
  DEMO_USER,
  DEMO_ANNOUNCEMENTS,
  DEMO_COMPANIES,
} from "./demoData"

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms))

function matchPath(path, pattern) {
  const regex = new RegExp("^" + pattern.replace(/:[^/]+/g, "([^/]+)") + "$")
  return path.match(regex)
}

export async function getDemoResponse(method, url, params = {}, data) {
  let path = (url || "").replace(/^\/api\/v1/, "").split("?")[0] || "/"
  if (path && !path.startsWith("/")) path = "/" + path
  await delay(150)

  // Homepage feed
  if (path === "/homepage/feed" || path.startsWith("/homepage/feed")) {
    let filtered = [...DEMO_PRODUCTS]
    const search = (params?.search || "").trim().toLowerCase()
    if (search) {
      filtered = filtered.filter((p) => (p.title || "").toLowerCase().includes(search))
    }
    const filter = params?.filter
    if (filter === "requests") filtered = filtered.filter((p) => p.type === "request")
    if (filter === "offers") filtered = filtered.filter((p) => p.type === "offer")
    if (filter === "wholesale") filtered = filtered.filter((p) => p.seller?.is_company || p.company)

    const regionId = params?.region_id ? Number(params.region_id) : null
    const cityId = params?.city_id ? Number(params.city_id) : null
    if (regionId) {
      const region = DEMO_REGIONS.find((r) => r.id === regionId)
      const cityNames = region?.cities?.map((c) => c.name) ?? []
      filtered = filtered.filter((p) => cityNames.includes(p.location))
    }
    if (cityId) {
      const city = DEMO_REGIONS.flatMap((r) => r.cities ?? []).find((c) => c.id === cityId)
      if (city) {
        filtered = filtered.filter((p) => p.location === city.name)
      }
    }

    const page = Number(params?.page) || 1
    const perPage = Number(params?.per_page) || 12
    const start = (page - 1) * perPage
    const items = filtered.slice(start, start + perPage)
    return {
      data: items,
      meta: {
        current_page: page,
        per_page: perPage,
        total: filtered.length,
        has_more: start + items.length < filtered.length,
      },
    }
  }

  // Categories
  if (path === "/categories") {
    return { data: DEMO_CATEGORIES }
  }

  // Subcategories
  const subcatMatch = matchPath(path, "/categories/:id/subcategories")
  if (subcatMatch) {
    const cat = DEMO_CATEGORIES.find((c) => c.id === Number(subcatMatch[1]))
    return { data: cat?.subcategories ?? [] }
  }

  // Regions
  if (path === "/regions" || path === "/areas") {
    return { data: DEMO_REGIONS }
  }

  // Cities by region
  const citiesMatch = matchPath(path, "/regions/:id/cities")
  if (citiesMatch && method === "GET") {
    const rid = Number(citiesMatch[1]) || citiesMatch[1]
    const region = DEMO_REGIONS.find((r) => r.id === rid || String(r.id) === String(rid))
    return { data: region?.cities ?? [] }
  }

  // Companies
  if (path === "/companies") {
    return { data: DEMO_COMPANIES }
  }

  // Announcements
  if (path === "/announcements") {
    return { data: DEMO_ANNOUNCEMENTS }
  }

  // Product by ID
  const productMatch = matchPath(path, "/products/:id")
  if (productMatch && method === "GET") {
    const id = Number(productMatch[1])
    const product = DEMO_PRODUCTS.find((p) => p.id === id)
    if (product) return { data: { ...product, comments: [], bids: [] } }
  }

  // Similar products
  const similarMatch = matchPath(path, "/products/:id/similar")
  if (similarMatch) {
    const id = Number(similarMatch[1])
    const similar = DEMO_PRODUCTS.filter((p) => p.id !== id).slice(0, 4)
    return { data: similar }
  }

  // User profile (legacy /users/:id format)
  const userMatch = matchPath(path, "/users/:id")
  if (userMatch && method === "GET") {
    const id = Number(userMatch[1])
    return { data: { ...DEMO_USER, id, listings: DEMO_PRODUCTS.filter((p) => p.seller?.id === id || id === 1) } }
  }

  // Public profile (by ID or username) — same format as backend PublicProfileController
  const byIdFallback = path.match(/\/profile\/by-id\/(\d+)/)
  const profileByIdMatch = path.startsWith("/profile/by-id/") && matchPath(path, "/profile/by-id/:id")
  const profileByUsernameMatch = !path.includes("by-id") && matchPath(path, "/profile/:username")
  const profileMatch = (profileByIdMatch || profileByUsernameMatch || byIdFallback) && method === "GET" && !path.includes("/listings") && !path.includes("/reviews")
  if (profileMatch) {
    const id = profileByIdMatch ? Number(profileByIdMatch[1]) : byIdFallback ? Number(byIdFallback[1]) : 1
    const listings = DEMO_PRODUCTS.filter((p) => p.seller?.id === id || id === 1)
    const user = {
      id,
      username: DEMO_USER.name || "مستخدم",
      avatar_url: DEMO_USER.avatar_url,
      cover_url: DEMO_USER.cover_photo_url,
      bio: DEMO_USER.bio,
      city: DEMO_USER.city?.name ?? "الرياض",
      region: DEMO_USER.city?.region?.name,
      location_lat: null,
      location_lng: null,
      is_online: true,
      last_seen_human: "منذ دقائق",
      is_verified: DEMO_USER.is_verified ?? false,
      financial_guarantee: DEMO_USER.financial_guarantee ?? 0,
      rating: DEMO_USER.reviews_avg ?? 4.5,
      total_ratings: DEMO_USER.reviews_count ?? 0,
      completed_orders: 45,
      member_since: "2024",
      is_owner: id === 1,
      _count: { listings: listings.length, reviews: DEMO_USER.reviews_count ?? 0 },
    }
    return {
      user,
      listings: listings.slice(0, 20),
      review_summary: { average: 4.5, total: 32, distribution: { 5: 20, 4: 8, 3: 3, 2: 1, 1: 0 } },
      company: null,
      my_review: null,
    }
  }

  // Profile listings (paginated)
  const profileListingsMatch = matchPath(path, "/profile/by-id/:id/listings") || matchPath(path, "/profile/:username/listings")
  if (profileListingsMatch && method === "GET") {
    const id = path.includes("by-id") ? Number(profileListingsMatch[1]) : 1
    const listings = DEMO_PRODUCTS.filter((p) => p.seller?.id === id || id === 1)
    const page = Number(params?.page) || 1
    const perPage = 12
    const start = (page - 1) * perPage
    const items = listings.slice(start, start + perPage)
    return {
      listings: items,
      pagination: { current_page: page, last_page: Math.ceil(listings.length / perPage), total: listings.length },
    }
  }

  // Profile reviews (paginated)
  const profileReviewsMatch = matchPath(path, "/profile/by-id/:id/reviews") || matchPath(path, "/profile/:username/reviews")
  if (profileReviewsMatch && method === "GET") {
    return {
      reviews: [],
      pagination: { current_page: 1, last_page: 1, total: 0 },
    }
  }

  // Search
  if (path === "/search") {
    const q = params?.q || ""
    const results = q ? DEMO_PRODUCTS.filter((p) => p.title?.toLowerCase().includes(q.toLowerCase())) : DEMO_PRODUCTS
    return { data: results.slice(0, 10) }
  }

  // Auth
  if (path === "/auth/user") {
    return { user: DEMO_USER }
  }
  if (path === "/auth/login" && method === "POST") {
    return { token: "demo-token", user: DEMO_USER }
  }
  if (path === "/auth/register" && method === "POST") {
    return { token: "demo-token", user: { ...DEMO_USER, name: data?.name || "مستخدم جديد" } }
  }

  // Products list (dashboard)
  if (path === "/products" && method === "GET") {
    return { data: DEMO_PRODUCTS }
  }

  // Favorites
  if (path === "/favorites") {
    return { data: [] }
  }

  // Notifications
  if (path.startsWith("/notifications")) {
    return { data: [] }
  }

  // Conversations
  if (path === "/conversations") {
    return { data: [] }
  }

  // Saved searches
  if (path === "/saved-searches") {
    return { data: [] }
  }

  // Product comments
  const commentsMatch = matchPath(path, "/products/:id/comments")
  if (commentsMatch && method === "GET") {
    return { data: [] }
  }

  // Product bids
  const bidsMatch = matchPath(path, "/products/:id/bids")
  if (bidsMatch && method === "GET") {
    return { data: [] }
  }

  // Homepage features
  if (path === "/homepage/features") {
    return { data: { show_wholesale: true, show_company_directory: true } }
  }

  // Visitors track
  if (path === "/visitors/track") {
    return { data: { ok: true } }
  }

  // Upload images — return placeholder URL for demo
  if ((path === "/upload" || path.startsWith("/upload")) && method === "POST") {
    return { url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400", data: { url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400" } }
  }

  // Create product/listing — return id for navigation
  if ((path === "/products" || path === "/listings") && method === "POST") {
    const id = Math.max(...DEMO_PRODUCTS.map((p) => p.id), 0) + 1
    return { data: { id, message: "تم نشر إعلانك بنجاح" } }
  }

  // Default: empty success for mutations in demo (login, register, etc.)
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return { data: { message: "Demo mode" } }
  }

  // Catch-all: profile paths (handles any URL format: /profile/by-id/1, profile/by-id/1, etc.)
  if (method === "GET" && (path.includes("profile") || path.includes("by-id"))) {
    const idMatch = path.match(/by-id[/](\d+)/) || path.match(/profile[/](\d+)/)
    const id = idMatch ? Number(idMatch[1]) : 1
    const listings = DEMO_PRODUCTS.filter((p) => p.seller?.id === id || id === 1)
    return {
      user: {
        id,
        username: DEMO_USER.name || "مستخدم",
        avatar_url: DEMO_USER.avatar_url,
        cover_url: DEMO_USER.cover_photo_url,
        bio: DEMO_USER.bio,
        city: DEMO_USER.city?.name ?? "الرياض",
        region: DEMO_USER.city?.region?.name,
        location_lat: null,
        location_lng: null,
        is_online: true,
        last_seen_human: "منذ دقائق",
        is_verified: DEMO_USER.is_verified ?? false,
        financial_guarantee: DEMO_USER.financial_guarantee ?? 0,
        rating: DEMO_USER.reviews_avg ?? 4.5,
        total_ratings: DEMO_USER.reviews_count ?? 0,
        completed_orders: 45,
        member_since: "2024",
        is_owner: id === 1,
        _count: { listings: listings.length, reviews: DEMO_USER.reviews_count ?? 0 },
      },
      listings: listings.slice(0, 20),
      review_summary: { average: 4.5, total: 32, distribution: { 5: 20, 4: 8, 3: 3, 2: 1, 1: 0 } },
      company: null,
      my_review: null,
    }
  }

  return { data: null }
}
