import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import apiClient from "@/lib/apiClient"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const SPEEDS = [
  { v: "fast", key: "fast", fallback: "سريع" },
  { v: "normal", key: "normal", fallback: "متوسط" },
  { v: "slow", key: "slow", fallback: "بطيء" },
]

/**
 * «قيّم هذا المنتج»: two quick questions (matches the photos? delivery / completion speed?)
 * for people who received the item or dealt with the seller about it.
 */
export function ListingFeedbackDialog({ open, onOpenChange, productId, initial = null, verified = false }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [matches, setMatches] = useState(initial?.matches_photos ?? null)
  const [speed, setSpeed] = useState(initial?.delivery_speed ?? null)
  const [comment, setComment] = useState(initial?.comment ?? "")

  const save = useMutation({
    mutationFn: async () =>
      (await apiClient.post(`/listings/${productId}/feedback`, {
        matches_photos: matches,
        delivery_speed: speed,
        comment: comment.trim() || null,
      })).data,
    onSuccess: (res) => {
      toast.success(res?.message ?? t("listingDetail.quality.thanks", "شكراً، تم حفظ تقييمك."))
      queryClient.invalidateQueries({ queryKey: ["product", String(productId)] })
      queryClient.invalidateQueries({ queryKey: ["product", productId] })
      queryClient.invalidateQueries({ queryKey: ["listing-feedback", productId] })
      onOpenChange(false)
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error", "حدث خطأ")),
  })

  const choice = (active, tone = "primary") =>
    cn(
      "h-10 rounded-md border text-sm font-semibold transition-colors",
      active
        ? tone === "bad"
          ? "border-destructive bg-destructive/10 text-destructive"
          : "border-primary bg-primary/10 text-primary"
        : "border-input hover:bg-muted",
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("listingDetail.quality.rateTitle", "قيّم هذا المنتج / الخدمة")}</DialogTitle>
          <DialogDescription>
            {verified
              ? t("listingDetail.quality.rateVerified", "تقييمك يظهر كمشترٍ موثّق.")
              : t("listingDetail.quality.rateHint", "قيّم بعد استلام المنتج أو إنجاز الخدمة.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("listingDetail.quality.qMatches", "هل المنتج / الخدمة مطابق للصور؟")}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={choice(matches === true)} aria-pressed={matches === true} onClick={() => setMatches(true)}>
                {t("listingDetail.quality.yesMatches", "نعم، مطابق")}
              </button>
              <button type="button" className={choice(matches === false, "bad")} aria-pressed={matches === false} onClick={() => setMatches(false)}>
                {t("listingDetail.quality.notMatches", "غير مطابق")}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("listingDetail.quality.deliverySpeed", "سرعة التوصيل / الإنجاز")}</p>
            <div className="grid grid-cols-3 gap-2">
              {SPEEDS.map((o) => (
                <button key={o.v} type="button" className={choice(speed === o.v)} aria-pressed={speed === o.v} onClick={() => setSpeed(o.v)}>
                  {t(`listingDetail.quality.speed.${o.key}`, o.fallback)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t("listingDetail.quality.comment", "ملاحظة (اختياري)")}</p>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} rows={3} className="resize-none text-sm" />
          </div>

          <Button className="w-full" disabled={matches === null || !speed || save.isPending} onClick={() => save.mutate()}>
            {initial ? t("listingDetail.quality.update", "تحديث تقييمي") : t("listingDetail.quality.submit", "إرسال التقييم")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
