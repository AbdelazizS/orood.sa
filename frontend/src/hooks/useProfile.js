import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"
import { getDemoResponse } from "@/lib/demoApi"

/** @param {string} identifier - Username or numeric ID (for /users/:id) */
function isById(identifier) {
  return identifier != null && /^\d+$/.test(String(identifier))
}

/** @param {string} identifier - Username or numeric ID */
function profilePath(identifier, suffix = "") {
  return isById(identifier)
    ? `/profile/by-id/${identifier}${suffix}`
    : `/profile/${identifier}${suffix}`
}

/** Extract user from various Laravel response shapes */
function extractProfile(res) {
  const raw = res?.data ?? res
  if (!raw || typeof raw !== "object") return null

  let payload = raw
  let user = raw.user ?? raw.data?.user

  if (!user && raw.data && typeof raw.data === "object") {
    payload = raw.data
    user = payload.user
  }

  if (user && user.data && typeof user.data === "object") user = user.data
  if (!user || typeof user !== "object") return null

  const listings = Array.isArray(payload.listings) ? payload.listings : payload.listings?.data ?? []
  const reviews = Array.isArray(payload.reviews) ? payload.reviews : payload.reviews?.data ?? []
  return { ...payload, user, listings, reviews }
}

async function getDemoProfile(identifier) {
  const fallback = await getDemoResponse("GET", profilePath(identifier))
  return fallback?.user ? fallback : fallback?.data ?? null
}

export function useProfile(identifier) {
  return useQuery({
    queryKey: ["profile", identifier],
    queryFn: async () => {
      try {
        const res = await apiClient.get(profilePath(identifier))
        const data = extractProfile(res)
        if (data?.user) return data
      } catch (_) {}
      const demo = await getDemoProfile(identifier)
      if (demo?.user) return demo
      throw new Error("Invalid profile response")
    },
    staleTime: 60_000,
    enabled: !!identifier,
    retry: 2,
    retryDelay: 1000,
  })
}

export function useProfileListings(identifier, page = 1) {
  return useQuery({
    queryKey: ["profile-listings", identifier, page],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get(profilePath(identifier, "/listings"), { params: { page } })
        return data
      } catch {
        const fallback = await getDemoResponse("GET", profilePath(identifier, "/listings"), { page })
        return fallback ?? { listings: [], pagination: { current_page: 1, last_page: 1, total: 0 } }
      }
    },
    placeholderData: (prev) => prev,
    enabled: !!identifier,
  })
}

export function useProfileReviews(identifier, page = 1) {
  return useQuery({
    queryKey: ["profile-reviews", identifier, page],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get(profilePath(identifier, "/reviews"), { params: { page } })
        return data
      } catch {
        const fallback = await getDemoResponse("GET", profilePath(identifier, "/reviews"), { page })
        return fallback ?? { reviews: [], pagination: { current_page: 1, last_page: 1, total: 0 } }
      }
    },
    placeholderData: (prev) => prev,
    enabled: !!identifier,
  })
}
