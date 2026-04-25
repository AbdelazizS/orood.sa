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

/** Mirrors backend CommentLikeController vote logic for optimistic UI. */
export function applyOptimisticCommentVote(comment, isLike) {
  const likes = Number(comment.likes_count ?? comment.likes ?? 0)
  const dislikes = Number(comment.dislikes_count ?? comment.dislikes ?? 0)
  const cur = comment.has_liked ?? comment.hasLiked

  let nextLikes = likes
  let nextDislikes = dislikes
  let nextHas = cur

  if (cur === true || cur === false) {
    if (cur === isLike) {
      if (isLike) nextLikes = Math.max(0, nextLikes - 1)
      else nextDislikes = Math.max(0, nextDislikes - 1)
      nextHas = null
    } else {
      if (cur === true) nextLikes = Math.max(0, nextLikes - 1)
      else nextDislikes = Math.max(0, nextDislikes - 1)
      if (isLike) nextLikes += 1
      else nextDislikes += 1
      nextHas = isLike
    }
  } else {
    if (isLike) nextLikes += 1
    else nextDislikes += 1
    nextHas = isLike
  }

  return {
    ...comment,
    likes_count: nextLikes,
    dislikes_count: nextDislikes,
    likes: nextLikes,
    dislikes: nextDislikes,
    has_liked: nextHas,
    hasLiked: nextHas,
  }
}

export function useLikeComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, listingId, is_like }) => {
      const { data: body } = await apiClient.post(`/comments/${id}/like`, { is_like })
      return { id, listingId, server: body?.data }
    },
    onMutate: async ({ id, listingId, is_like }) => {
      await qc.cancelQueries({ queryKey: ["listing-comments", listingId] })
      const previous = qc.getQueryData(["listing-comments", listingId])
      qc.setQueryData(["listing-comments", listingId], (old) => {
        if (!old?.comments) return old
        return {
          ...old,
          comments: old.comments.map((c) => (c.id === id ? applyOptimisticCommentVote(c, is_like) : c)),
        }
      })
      return { previous }
    },
    onError: (_err, { listingId }, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(["listing-comments", listingId], context.previous)
      }
    },
    onSuccess: (res) => {
      const { id, listingId, server } = res
      if (!server || listingId == null) return
      qc.setQueryData(["listing-comments", listingId], (old) => {
        if (!old?.comments) return old
        return {
          ...old,
          comments: old.comments.map((c) =>
            c.id === id
              ? {
                  ...c,
                  likes_count: server.likes,
                  dislikes_count: server.dislikes,
                  likes: server.likes,
                  dislikes: server.dislikes,
                  has_liked: server.has_liked,
                  hasLiked: server.has_liked,
                }
              : c
          ),
        }
      })
    },
  })
}

