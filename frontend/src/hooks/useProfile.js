import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"
import { isProfileIdentifierNumeric } from "@/lib/profileRoutes"

function isValidIdentifier(identifier) {
  if (typeof identifier !== "string") return false
  const value = identifier.trim()
  if (!value) return false
  if (value === "undefined" || value === "null") return false
  return true
}

function extractProfileData(response) {
  if (response?.data?.data) return response.data.data
  if (response?.data) return response.data
  return response
}

export function getProfileQueryKey(identifier) {
  const raw = typeof identifier === "string" ? identifier.trim() : ""
  if (!isValidIdentifier(raw)) return ["profile", "invalid", ""]
  return isProfileIdentifierNumeric(raw) ? ["profile", "id", raw] : ["profile", "username", raw]
}

/**
 * Public profile by username or numeric user id (matches GET /profile/{username} or /profile/by-id/{id}).
 */
export function useProfile(identifier) {
  const raw = isValidIdentifier(identifier) ? identifier.trim() : ""
  const byId = isProfileIdentifierNumeric(raw)

  return useQuery({
    queryKey: getProfileQueryKey(raw),
    queryFn: async () => {
      if (!raw) throw new Error("Profile identifier is required")

      const path = byId ? `/profile/by-id/${raw}` : `/profile/${encodeURIComponent(raw)}`
      const response = await apiClient.get(path, { timeout: 30_000 })
      const payload = response?.data
      if (payload?.success === false) {
        throw new Error(payload?.message || "Failed to load profile")
      }
      return extractProfileData(response)
    },
    enabled: !!raw,
    retry: 1,
    staleTime: 60_000,
  })
}

export function useProfileListings(identifier) {
  const raw = isValidIdentifier(identifier) ? identifier.trim() : ""
  const byId = isProfileIdentifierNumeric(raw)

  return useInfiniteQuery({
    queryKey: [...getProfileQueryKey(raw), "listings"],
    queryFn: async ({ pageParam = 1 }) => {
      const path = byId
        ? `/profile/by-id/${raw}/listings`
        : `/profile/${encodeURIComponent(raw)}/listings`
      const response = await apiClient.get(path, { params: { page: pageParam } })
      const body = response?.data ?? {}
      const listings = Array.isArray(body.listings) ? body.listings : []
      const pagination = body.pagination ?? {
        current_page: pageParam,
        last_page: listings.length > 0 ? pageParam : pageParam,
        total: listings.length,
      }
      return { listings, pagination }
    },
    getNextPageParam: (lastPage) => {
      const cur = Number(lastPage?.pagination?.current_page ?? 1)
      const last = Number(lastPage?.pagination?.last_page ?? 1)
      return cur < last ? cur + 1 : undefined
    },
    initialPageParam: 1,
    enabled: !!raw,
    retry: 1,
  })
}

export function useProfileReviews(identifier) {
  const raw = isValidIdentifier(identifier) ? identifier.trim() : ""
  const byId = isProfileIdentifierNumeric(raw)

  return useInfiniteQuery({
    queryKey: [...getProfileQueryKey(raw), "reviews"],
    queryFn: async ({ pageParam = 1 }) => {
      const path = byId
        ? `/profile/by-id/${raw}/reviews`
        : `/profile/${encodeURIComponent(raw)}/reviews`
      const response = await apiClient.get(path, { params: { page: pageParam } })
      const body = response?.data ?? {}
      const reviews = Array.isArray(body.reviews) ? body.reviews : []
      const pagination = body.pagination ?? {
        current_page: pageParam,
        last_page: reviews.length > 0 ? pageParam : pageParam,
        total: reviews.length,
      }
      return { reviews, pagination }
    },
    getNextPageParam: (lastPage) => {
      const cur = Number(lastPage?.pagination?.current_page ?? 1)
      const last = Number(lastPage?.pagination?.last_page ?? 1)
      return cur < last ? cur + 1 : undefined
    },
    initialPageParam: 1,
    enabled: !!raw,
    retry: 1,
  })
}
