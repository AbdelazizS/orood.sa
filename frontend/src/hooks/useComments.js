import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"

export function useListingComments(listingId) {
  return useQuery({
    queryKey: ["listing-comments", listingId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/products/${listingId}/comments`)
      return {
        comments: data?.comments ?? [],
        meta: data?.meta ?? {},
      }
    },
    enabled: !!listingId,
  })
}

export function usePostComment(listingId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => apiClient.post(`/products/${listingId}/comments`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listing-comments", listingId] }),
  })
}

export function useEditComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body, listingId }) =>
      apiClient.put(`/comments/${id}`, { body }).then((r) => ({ listingId, data: r.data })),
    onSuccess: (res) => qc.invalidateQueries({ queryKey: ["listing-comments", res?.listingId] }),
  })
}

export function useDeleteComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, listingId }) => apiClient.delete(`/comments/${id}`).then((r) => ({ listingId, data: r.data })),
    onSuccess: (res) => qc.invalidateQueries({ queryKey: ["listing-comments", res?.listingId] }),
  })
}

export function useToggleCommentVisibility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, listingId }) =>
      apiClient.patch(`/comments/${id}/visibility`).then((r) => ({ listingId, data: r.data })),
    onSuccess: (res) => qc.invalidateQueries({ queryKey: ["listing-comments", res?.listingId] }),
  })
}

export function useLikeComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, listingId, is_like }) =>
      apiClient.post(`/comments/${id}/like`, { is_like }).then((r) => ({ listingId, data: r.data })),
    onSuccess: (res) => qc.invalidateQueries({ queryKey: ["listing-comments", res?.listingId] }),
  })
}

