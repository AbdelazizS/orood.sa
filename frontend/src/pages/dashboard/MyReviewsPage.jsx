import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { StarRating } from "@/components/ui/StarRating"
import { RatingBar } from "@/components/ui/RatingBar"
import { ReviewCard } from "@/components/reviews/ReviewCard"
import { useMyReviews, useReviewsGiven } from "@/hooks/useReviews"
import { resolveImageUrl } from "@/lib/imageUrl"
import { Star } from "lucide-react"

export function MyReviewsPage() {
  const [tab, setTab] = useState("received")
  const {
    reviews,
    summary,
    pagination,
    isLoading,
    deleteReview,
  } = useMyReviews()

  const { data: givenData, isLoading: givenLoading } = useReviewsGiven()

  return (
    <div className="space-y-5" dir="rtl">
      <h1 className="text-right text-xl font-bold">التقييمات</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="received" className="flex-1">
            تقييماتي المستلمة
            {summary?.total > 0 && (
              <Badge variant="secondary" className="ms-1.5 text-xs">
                {summary.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="given" className="flex-1">
            تقييماتي المرسلة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-4">
          {summary && summary.total > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-5">
                  <div className="shrink-0 text-center">
                    <p className="text-4xl font-bold text-foreground">
                      {summary.average?.toFixed(1)}
                    </p>
                    <StarRating
                      value={summary.average}
                      readonly
                      size="sm"
                      className="mt-1 justify-center"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {summary.total} تقييم
                    </p>
                  </div>
                  <div className="flex-1">
                    <RatingBar
                      distribution={summary.distribution ?? {}}
                      total={summary.total}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-border p-4">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="ms-auto h-4 w-32" />
                    <Skeleton className="ms-auto h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <Star size={36} className="mx-auto mb-3 text-muted-foreground" />
              <p className="font-semibold text-foreground">لا توجد تقييمات بعد</p>
              <p className="mt-1 text-sm text-muted-foreground">
                ستظهر هنا تقييمات المشترين والبائعين
              </p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                {reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    showActions={true}
                    onDelete={(id) => deleteReview.mutate(id)}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="given" className="mt-4">
          {givenLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (givenData?.reviews ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <Star size={36} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">لم تكتب أي تقييم بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(givenData?.reviews ?? []).map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="mb-3 flex items-center justify-end gap-2">
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {review.target?.username ?? review.reviewer?.username ?? "—"}
                      </p>
                      <StarRating
                        value={review.rating}
                        readonly
                        size="xs"
                        className="mt-0.5 justify-end"
                      />
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={resolveImageUrl(review.target?.avatar_url ?? review.reviewer?.avatar_url)} />
                      <AvatarFallback className="text-xs">
                        {(review.target?.username ?? review.reviewer?.username ?? "?")[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {review.comment && (
                    <p className="text-right text-sm text-muted-foreground">
                      {review.comment}
                    </p>
                  )}
                  <p className="mt-2 text-right text-xs text-muted-foreground">
                    {review.human_time}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
