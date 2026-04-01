import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"
import { toast } from "sonner"

export function useMyReviews() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["my-reviews"],
    queryFn: () => apiClient.get("/reviews/my").then((r) => r.data),
    staleTime: 30_000,
  })

  const deleteReview = useMutation({
    mutationFn: (id) => apiClient.delete(`/reviews/${id}`).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? "حدث خطأ")
    },
  })

  return {
    reviews: query.data?.reviews ?? [],
    summary: query.data?.summary,
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    deleteReview,
  }
}

export function useReviewsGiven() {
  return useQuery({
    queryKey: ["reviews-given"],
    queryFn: () => apiClient.get("/reviews/given").then((r) => r.data),
    staleTime: 30_000,
  })
}
