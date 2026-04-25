import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import apiClient from "@/lib/apiClient"
import { Star, Loader2 } from "lucide-react"

export function ReviewSection({ profile, currentUser, isOwnProfile }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [showForm, setShowForm] = useState(false)

  const submitMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/reviews", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] })
      setShowForm(false)
      setComment("")
      setRating(5)
    },
  })

  const hasReviewed = profile.reviews?.some((r) => r.reviewer?.id === currentUser?.id)
  const canReview = currentUser && !isOwnProfile && !hasReviewed

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("reviews.title", "Reviews")}</CardTitle>
        {profile.reviews?.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {profile.reviews_avg} {t("reviews.rating", "stars")} - {profile.reviews_count} {t("reviews.title", "reviews")}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {canReview && !showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            {t("reviews.submit", "Write a review")}
          </Button>
        )}

        {canReview && showForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitMutation.mutate({
                reviewee_id: profile.id,
                rating,
                comment: comment || null,
              })
            }}
            className="space-y-4 rounded-lg border p-4"
          >
            <div>
              <Label>{t("reviews.rating", "Rating")}</Label>
              <div className="mt-1 flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="rounded p-1 hover:bg-muted"
                  >
                    <Star className={`size-6 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>{t("reviews.comment", "Comment")}</Label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("reviews.submit", "Submit")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {profile.reviews?.map((r) => (
            <div key={r.id} className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.reviewer?.name}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`size-4 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</span>
              </div>
              {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
              {r.product && (
                <p className="mt-1 text-xs">
                  {t("reviews.forProduct", "For")}: {r.product.title}
                </p>
              )}
            </div>
          ))}
        </div>

        {(!profile.reviews || profile.reviews.length === 0) && !canReview && (
          <p className="text-muted-foreground">{t("reviews.empty", "No reviews yet")}</p>
        )}
      </CardContent>
    </Card>
  )
}
