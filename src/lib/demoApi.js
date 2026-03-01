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
  const path = (url || "").replace(/^\/api\/v1/, "").split("?")[0] || "/"
  await delay(150)

  // Homepage feed
  if (path === "/homepage/feed" || path.startsWith("/homepage/feed")) {
    const page = Number(params?.page) || 1
    const perPage = 12
    const start = (page - 1) * perPage
    const items = DEMO_PRODUCTS.slice(start, start + perPage)
    return {
      data: items,
      meta: { current_page: page, per_page: perPage, total: DEMO_PRODUCTS.length, has_more: start + items.length < DEMO_PRODUCTS.length },
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

  // User profile
  const userMatch = matchPath(path, "/users/:id")
  if (userMatch && method === "GET") {
    const id = Number(userMatch[1])
    return { data: { ...DEMO_USER, id, listings: DEMO_PRODUCTS.filter((p) => p.seller?.id === id || id === 1) } }
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

  // Visitors track, upload, etc.
  if (path === "/visitors/track" || path.startsWith("/upload")) {
    return { data: { ok: true } }
  }

  // Default: empty success for mutations in demo (login, register, etc.)
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return { data: { message: "Demo mode" } }
  }

  return { data: null }
}
