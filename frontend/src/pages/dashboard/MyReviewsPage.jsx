import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { useMyReviews } from "@/hooks/useReviews"
import { ReviewCard } from "@/components/reviews/ReviewCard"
import { RatingBar } from "@/components/ui/RatingBar"
import { StarRating } from "@/components/ui/StarRating"
import { Skeleton } from "@/components/ui/skeleton"

export function MyReviewsPage() {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const { reviews, summary, isLoading } = useMyReviews()

  const avg = Number(summary?.average ?? 0)
  const total = Number(summary?.total ?? 0)
  const distribution = summary?.distribution ?? {}

  return (
    <div className="space-y-6 p-4 md:p-6" dir={direction}>
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {t("dashboard.reviewsPage.title", "التقييمات الواردة")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.reviewsPage.subtitle", "آراء المشترين بعد إتمام الطلبات")}
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full max-w-md" />
      ) : (
        <div className="grid gap-6 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(0,220px),1fr] md:items-start">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StarRating value={avg} readonly size="md" showValue={total > 0} className="text-yellow-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.reviewsPage.totalLabel", { count: total, defaultValue: "{{count}} تقييم" })}
            </p>
            {total > 0 ? <RatingBar distribution={distribution} total={total} /> : null}
          </div>
          <div className="min-w-0">
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("dashboard.reviewsPage.empty", "لا توجد تقييمات بعد")}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} showActions={false} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
