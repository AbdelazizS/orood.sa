import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  adminApproveCreditRequest,
  adminListCreditRequests,
  adminRejectCreditRequest,
} from "@/services/subscriberService"
import { timeAgo } from "@/lib/timeAgo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_STYLES = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
}

/**
 * Admin: subscribers' top-up requests. Approving adds the credits right away.
 */
export function AdminCreditRequestsPanel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [action, setAction] = useState(null) // { type: 'approve'|'reject', row }
  const [quantity, setQuantity] = useState("")
  const [adminNote, setAdminNote] = useState("")
  const [amount, setAmount] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "subscriber-credit-requests"],
    queryFn: () => adminListCreditRequests(),
    refetchInterval: 30_000,
  })
  const rows = data?.items ?? []

  const mutation = useMutation({
    mutationFn: () =>
      action.type === "approve"
        ? adminApproveCreditRequest(action.row.id, Number(quantity) || undefined, adminNote.trim(), amount !== "" ? Number(amount) : undefined)
        : adminRejectCreditRequest(action.row.id, adminNote.trim()),
    onSuccess: () => {
      toast.success(
        action.type === "approve"
          ? t("adminSubscribers.requestApproved", "تمت الموافقة وأُضيف الرصيد")
          : t("adminSubscribers.requestRejected", "تم رفض الطلب"),
      )
      setAction(null)
      queryClient.invalidateQueries({ queryKey: ["admin", "subscriber-credit-requests"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "subscribers"] })
    },
    onError: (err) => {
      const first = Object.values(err?.response?.data?.errors ?? {})[0]?.[0]
      toast.error(first ?? err?.response?.data?.message ?? t("common.errorGeneric", "حدث خطأ"))
    },
  })

  const open = (type, row) => {
    setQuantity(String(row.quantity))
    setAdminNote("")
    setAmount(row.amount_sar != null ? String(row.amount_sar) : "")
    setAction({ type, row })
  }

  const statusLabel = (s) =>
    s === "approved"
      ? t("subscriber.credits.statusApproved", "تمت الموافقة")
      : s === "rejected"
        ? t("subscriber.credits.statusRejected", "مرفوض")
        : t("subscriber.credits.statusPending", "قيد المراجعة")

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("adminSubscribers.noRequests", "لا توجد طلبات رصيد")}</p>
  }

  return (
    <>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{r.subscriber?.name}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLES[r.status])}>{statusLabel(r.status)}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(r.created_at, t)}</span>
              </div>
              <p className="mt-0.5 text-sm">
                {r.amount_sar != null ? `${Math.round(r.amount_sar).toLocaleString("en-US")} ${t("common.currency", "ريال")} · ` : ""}
                {t("adminSubscribers.requestsQty", {
                  count: r.quantity,
                  defaultValue: "يطلب {{count}} إعلان",
                })}
                {r.status === "approved" && r.approved_quantity !== r.quantity
                  ? ` — ${t("adminSubscribers.approvedQty", { count: r.approved_quantity, defaultValue: "أُضيف {{count}}" })}`
                  : null}
              </p>
              {r.note ? <p className="text-xs text-muted-foreground">“{r.note}”</p> : null}
              {r.admin_note ? <p className="text-xs text-muted-foreground">{t("subscriber.credits.adminNote", "رد الإدارة")}: {r.admin_note}</p> : null}
            </div>
            {r.status === "pending" ? (
              <div className="flex shrink-0 gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => open("approve", r)}>
                  <Check className="size-4" aria-hidden />
                  {t("adminSubscribers.approve", "موافقة")}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => open("reject", r)}>
                  <X className="size-4" aria-hidden />
                  {t("adminSubscribers.reject", "رفض")}
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <Dialog open={Boolean(action)} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {action?.type === "approve"
                ? t("adminSubscribers.approveTitle", "الموافقة على طلب الرصيد")
                : t("adminSubscribers.rejectTitle", "رفض طلب الرصيد")}
            </DialogTitle>
            <DialogDescription>{action?.row?.subscriber?.name}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate()
            }}
          >
            {action?.type === "approve" ? (
              <div className="space-y-1.5">
                <Label htmlFor="approve-qty">{t("adminSubscribers.credits", "عدد الإعلانات")}</Label>
                <Input id="approve-qty" type="number" min={1} dir="ltr" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            ) : null}
            {action?.type === "approve" ? (
              <div className="space-y-1.5">
                <Label htmlFor="approve-amount">{t("adminSubscribers.amountPaid", "المبلغ المدفوع (ريال)")}</Label>
                <Input id="approve-amount" type="number" min={0} dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t("adminSubscribers.amountDefault", "فارغ = السعر الافتراضي × العدد")} />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="admin-note">{t("adminSubscribers.replyNote", "رسالة للمشترك (اختياري)")}</Label>
              <Input id="admin-note" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" variant={action?.type === "reject" ? "destructive" : "default"} disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : action?.type === "approve" ? t("adminSubscribers.approve", "موافقة") : t("adminSubscribers.reject", "رفض")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
