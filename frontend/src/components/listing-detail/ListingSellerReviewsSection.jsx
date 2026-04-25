import { useTranslation } from "react-i18next"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/store/useAuthStore"
import { useListingSellerReviews } from "@/hooks/useListingSellerReviews"
import { ReviewCard } from "@/components/reviews/ReviewCard"
import { StarRating } from "@/components/ui/StarRating"
import apiClient from "@/lib/apiClient"
import { Skeleton } from "@/components/ui/skeleton"

export function ListingSellerReviewsSection({ productId }) {
  const { t } = useTranslation()
  const { token } = useAuthStore()
  const queryClient = useQueryClient()
  const { data, isLoading } = useListingSellerReviews(productId)

  const reactMutation = useMutation({
    mutationFn: async ({ reviewId, type }) => {
      const { data: res } = await apiClient.post(`/reviews/${reviewId}/react`, { type })
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listing-reviews", String(productId)] })
    },
  })

  const reviews = Array.isArray(data?.data) ? data.data : []
  const meta = data?.meta ?? {}
  const avg = Number(meta.avg_rating ?? 0)
  const totalRatings = Number(meta.total_ratings ?? 0)

  if (isLoading) {
    return (
      <div className="space-y-3 border-t border-border px-4 py-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <section className="border-t border-border px-4 py-4 text-start">
      <h2 className="text-base font-semibold text-foreground">
        {t("listingDetail.sellerReviewsTitle", "تقييمات البائع")}
      </h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StarRating value={avg} readonly size="sm" showValue={totalRatings > 0} className="text-yellow-500" />
        {totalRatings > 0 ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {t("listingDetail.sellerReviewsCount", { count: totalRatings, defaultValue: "{{count}} تقييم" })}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {t("listingDetail.sellerReviewsEmpty", "لا توجد تقييمات لهذا البائع بعد")}
          </span>
        )}
      </div>

      {reviews.length === 0 ? null : (
        <div className="mt-3 divide-y divide-border rounded-lg border border-border">
          {reviews.map((review) => (
            <div key={review.id} className="px-3">
              <ReviewCard
                review={review}
                showActions={false}
                onReact={
                  token
                    ? (reviewId, type) => reactMutation.mutate({ reviewId, type })
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
