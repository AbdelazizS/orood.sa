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
  onSuccess,
}) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [comment, setComment] = useState(existingReview?.comment ?? "")
  const queryClient = useQueryClient()
  const { direction } = useAppDirection()

  const submit = useMutation({
    mutationFn: async () => {
      const payload = { target_id: targetUser.id, rating, comment }
      if (existingReview) {
        const { data } = await apiClient.put(`/reviews/${existingReview.id}`, payload)
        return data
      }
      const { data } = await apiClient.post("/reviews", payload)
      return data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ["profile", targetUser.username] })
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] })
      queryClient.invalidateQueries({ queryKey: ["profile-reviews", targetUser.username] })
      onSuccess?.(data.review)
      onClose()
    },
    onError: (err) => {
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
    <Dialog open={open} onOpenChange={onClose}>
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
            disabled={rating === 0 || submit.isPending}
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
