import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"

export function useListingSellerReviews(listingId, enabled = true) {
  return useQuery({
    queryKey: ["listing-reviews", String(listingId ?? "")],
    queryFn: async () => {
      const { data } = await apiClient.get(`/listings/${listingId}/reviews`)
      return data
    },
    enabled: Boolean(listingId) && enabled,
    staleTime: 30_000,
  })
}
