import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StarRating } from "@/components/ui/StarRating"
import apiClient from "@/lib/apiClient"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function LeaveReviewModal({
  open,
  onClose,
  targetUser,
  existingReview,
  purchaseId = null,
  /** When set, invalidates listing seller reviews after submit (product/listing id). */
  listingProductId = null,
  /** TanStack query key prefix for public profile (e.g. getProfileQueryKey(identifier)). */
  profileQueryKey = null,
  /** Buyer rating the seller after delivery: also ask «مطابق للصور؟» and «سرعة التوصيل». */
  askListingQuestions = false,
  onSuccess,
}) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [comment, setComment] = useState(existingReview?.comment ?? "")
  const [matchesPhotos, setMatchesPhotos] = useState(null)
  const [deliverySpeed, setDeliverySpeed] = useState(null)
  const queryClient = useQueryClient()
  const { direction } = useAppDirection()

  const submit = useMutation({
    mutationFn: async () => {
      const payload = {
        target_id: targetUser.id,
        rating,
        comment,
        ...(askListingQuestions && matchesPhotos !== null ? { matches_photos: matchesPhotos } : {}),
        ...(askListingQuestions && deliverySpeed ? { delivery_speed: deliverySpeed } : {}),
      }
      if (existingReview) {
        const { data } = await apiClient.put(`/reviews/${existingReview.id}`, payload)
        return data
      }
      if (!purchaseId) {
        throw new Error("purchase_required")
      }
      const { data } = await apiClient.post("/reviews", { ...payload, purchase_id: purchaseId })
      return data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      if (Array.isArray(profileQueryKey) && profileQueryKey.length) {
        queryClient.invalidateQueries({ queryKey: profileQueryKey })
        queryClient.invalidateQueries({ queryKey: [...profileQueryKey, "reviews"] })
        queryClient.invalidateQueries({ queryKey: [...profileQueryKey, "listings"] })
      } else {
        queryClient.invalidateQueries({ queryKey: ["profile", targetUser.username] })
        queryClient.invalidateQueries({ queryKey: ["profile-reviews", targetUser.username] })
      }
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] })
      queryClient.invalidateQueries({ queryKey: ["product"] })
      if (listingProductId != null) {
        queryClient.invalidateQueries({ queryKey: ["listing-reviews", String(listingProductId)] })
      }
      onSuccess?.(data.review)
      onClose()
    },
    onError: (err) => {
      if (err?.message === "purchase_required") {
        toast.error("رقم الطلب مطلوب للتقييم")
        return
      }
      toast.error(err?.response?.data?.message ?? "حدث خطأ")
    },
  })

  const ratingLabels = {
    0: "اختر تقييمك",
    1: "سيء 😞",
    2: "مقبول 😐",
    3: "جيد 🙂",
    4: "جيد جداً 😊",
    5: "ممتاز 🌟",
  }

  const username = targetUser?.username ?? targetUser?.name ?? ""

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose?.()
      }}
    >
      <DialogContent dir={direction} className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-start">
            {existingReview ? "تعديل تقييمك" : "أضف تقييماً"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
          <div className="flex-1 text-start">
            <p className="text-sm font-semibold">{username}</p>
            <p className="text-xs text-muted-foreground">
              شاركنا تجربتك مع هذا المستخدم
            </p>
          </div>
          <Avatar className="h-10 w-10">
            <AvatarImage src={targetUser?.avatar_url} />
            <AvatarFallback>{username.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>

        <div className="space-y-2 text-center">
          <StarRating
            value={rating}
            onChange={setRating}
            size="lg"
            className="justify-center"
          />
          <p
            className={cn(
              "text-sm font-medium transition-colors",
              rating === 0
                ? "text-muted-foreground"
                : rating >= 4
                  ? "text-primary"
                  : rating >= 3
                    ? "text-foreground"
                    : "text-destructive"
            )}
          >
            {ratingLabels[rating]}
          </p>
        </div>

        {askListingQuestions ? (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="space-y-1.5">
              <p className="text-start text-sm font-medium">هل المنتج / الخدمة مطابق للصور؟</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: true, label: "نعم، مطابق" },
                  { v: false, label: "غير مطابق" },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    type="button"
                    onClick={() => setMatchesPhotos(o.v)}
                    aria-pressed={matchesPhotos === o.v}
                    className={cn(
                      "h-9 rounded-md border text-sm font-semibold transition-colors",
                      matchesPhotos === o.v
                        ? o.v ? "border-primary bg-primary/10 text-primary" : "border-destructive bg-destructive/10 text-destructive"
                        : "border-input hover:bg-muted",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-start text-sm font-medium">سرعة التوصيل / الإنجاز</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "fast", label: "سريع" },
                  { v: "normal", label: "متوسط" },
                  { v: "slow", label: "بطيء" },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setDeliverySpeed(o.v)}
                    aria-pressed={deliverySpeed === o.v}
                    className={cn(
                      "h-9 rounded-md border text-sm font-semibold transition-colors",
                      deliverySpeed === o.v ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-muted",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-1">
          <label className="block text-start text-sm font-medium">
            تعليق (اختياري)
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="اكتب تعليقك هنا..."
            rows={3}
            maxLength={1000}
            dir={direction}
            className="resize-none text-sm"
          />
          <p className="text-left text-xs text-muted-foreground">
            {comment.length}/1000
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            className="flex-1"
            disabled={rating === 0 || submit.isPending || (!existingReview && !purchaseId)}
            onClick={() => submit.mutate()}
          >
            {submit.isPending && (
              <Loader2 size={14} className="me-1.5 animate-spin" />
            )}
            {existingReview ? "تحديث التقييم" : "إرسال التقييم"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
