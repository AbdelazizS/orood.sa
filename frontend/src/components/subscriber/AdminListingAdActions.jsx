import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { adminCancelSubscriberListing, adminMarkSubscriberListingSold } from "@/services/subscriberService"
import { usePermission } from "@/hooks/usePermission"
import { AdStatusBadge } from "@/components/subscriber/SubscriberListingCard"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

/**
 * Admin actions on a bought ad (PDF note 3): mark sold, or cancel at the property owner's request
 * (optionally refunding the ad to the subscriber).
 */
export function AdminListingAdActions({ row, onDone }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canManage = usePermission("subscribers.manage")
  const [cancelOpen, setCancelOpen] = useState(false)
  const [refund, setRefund] = useState(true)
  const [reason, setReason] = useState("")

  const refresh = (next) => {
    queryClient.invalidateQueries({ queryKey: ["admin", "subscriber-listings"] })
    queryClient.invalidateQueries({ queryKey: ["admin", "subscribers"] })
    onDone?.(next)
  }
  const onError = (err) => {
    const first = Object.values(err?.response?.data?.errors ?? {})[0]?.[0]
    toast.error(first ?? err?.response?.data?.message ?? t("common.errorGeneric", "حدث خطأ"))
  }

  const sold = useMutation({
    mutationFn: () => adminMarkSubscriberListingSold(row.id),
    onSuccess: (res) => {
      toast.success(t("subscriber.ad.markedSold", "تم تسجيل بيع العقار"))
      refresh({ status: res.status })
    },
    onError,
  })
  const cancel = useMutation({
    mutationFn: () => adminCancelSubscriberListing(row.id, refund, reason.trim()),
    onSuccess: (res) => {
      toast.success(t("adminSubscribers.cancelled", "أُلغي الإعلان"))
      setCancelOpen(false)
      refresh({ status: res.status, refunded: res.refunded })
    },
    onError,
  })

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">{t("subscriber.ad.title", "حالة الإعلان")}</h3>
        <AdStatusBadge status={row.status} daysLeft={row.days_left} />
      </div>
      {row.end_reason ? <p className="text-xs text-muted-foreground">{row.end_reason}{row.refunded ? ` · ${t("adminSubscribers.refunded", "تم استرجاع الإعلان")}` : ""}</p> : null}

      {row.status === "active" ? (
        cancelOpen ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              cancel.mutate()
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason">{t("adminSubscribers.cancelReason", "سبب الإلغاء")}</Label>
              <Input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("adminSubscribers.cancelReasonPh", "مثال: المالك باع العقار بنفسه")} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={refund} onCheckedChange={(v) => setRefund(v === true)} />
              {t("adminSubscribers.refundAd", "إرجاع الإعلان لرصيد المشترك")}
            </label>
            <div className="flex gap-2">
              <Button type="submit" size="sm" variant="destructive" disabled={cancel.isPending}>
                {cancel.isPending ? <Loader2 className="size-4 animate-spin" /> : t("adminSubscribers.confirmCancel", "تأكيد الإلغاء")}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setCancelOpen(false)}>
                {t("common.cancel", "إلغاء")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => sold.mutate()} disabled={sold.isPending}>
              {t("subscriber.ad.markSold", "تم بيع العقار")}
            </Button>
            {canManage ? (
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => setCancelOpen(true)}>
                {t("adminSubscribers.cancelByOwner", "إلغاء بطلب صاحب العقار")}
              </Button>
            ) : null}
          </div>
        )
      ) : null}
    </section>
  )
}
