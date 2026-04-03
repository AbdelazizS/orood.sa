import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"

function isValidUsername(username) {
  if (typeof username !== "string") return false
  const value = username.trim()
  if (!value) return false
  if (value === "undefined" || value === "null") return false
  return true
}

function extractProfileData(response) {
  if (response?.data?.data) return response.data.data
  if (response?.data) return response.data
  return response
}

export function useProfile(username) {
  const validUsername = isValidUsername(username) ? username.trim() : ""
  return useQuery({
    queryKey: ["profile", validUsername],
    queryFn: async () => {
      if (!validUsername) throw new Error("Username is required")

      const response = await apiClient.get(`/api/profile/${validUsername}`)
      const payload = response?.data
      if (payload?.success === false) {
        throw new Error(payload?.message || "Failed to load profile")
      }
      return extractProfileData(response)
    },
    enabled: !!validUsername,
    retry: 1,
    staleTime: 60_000,
  })
}

export function useProfileListings(username) {
  const validUsername = isValidUsername(username) ? username.trim() : ""
  return useInfiniteQuery({
    queryKey: ["profile-listings", validUsername],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.get(`/api/profile/${validUsername}/listings`, { params: { page: pageParam } })
      return response?.data?.data ?? response?.data?.listings ?? []
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!Array.isArray(lastPage) || lastPage.length < 12) return undefined
      return allPages.length + 1
    },
    enabled: !!validUsername,
    retry: 1,
  })
}

export function useProfileReviews(username) {
  const validUsername = isValidUsername(username) ? username.trim() : ""
  return useQuery({
    queryKey: ["profile-reviews", validUsername],
    queryFn: async () => {
      const response = await apiClient.get(`/api/profile/${validUsername}/reviews`)
      return response?.data?.data ?? response?.data?.reviews ?? []
    },
    enabled: !!validUsername,
    retry: 1,
  })
}
