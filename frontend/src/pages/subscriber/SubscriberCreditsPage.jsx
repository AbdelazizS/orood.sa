import { useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { getSubscriberCredits, requestSubscriberCredits } from "@/services/subscriberService"
import { SubscriberPageHeader } from "@/components/subscriber/SubscriberPageHeader"
import { timeAgo } from "@/lib/timeAgo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Coins, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_STYLES = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
}

/**
 * Credits: balance, top-up request to the admins, request history and the full credit ledger.
 */
export function SubscriberCreditsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [quantity, setQuantity] = useState("10")
  const [note, setNote] = useState("")
  const [amount, setAmount] = useState("")

  const { data, isLoading } = useQuery({ queryKey: ["subscriber", "credits"], queryFn: getSubscriberCredits })
  const pending = (data?.requests ?? []).find((r) => r.status === "pending")

  const requestMutation = useMutation({
    mutationFn: () => requestSubscriberCredits(Number(quantity), note.trim(), amount ? Number(amount) : undefined),
    onSuccess: () => {
      toast.success(t("subscriber.credits.sent", "تم إرسال الطلب للإدارة"))
      setNote("")
      queryClient.invalidateQueries({ queryKey: ["subscriber"] })
    },
    onError: (err) => {
      const first = Object.values(err?.response?.data?.errors ?? {})[0]?.[0]
      toast.error(first ?? err?.response?.data?.message ?? t("common.errorGeneric", "حدث خطأ"))
    },
  })

  const statusLabel = (s) =>
    s === "approved"
      ? t("subscriber.credits.statusApproved", "تمت الموافقة")
      : s === "rejected"
        ? t("subscriber.credits.statusRejected", "مرفوض")
        : t("subscriber.credits.statusPending", "قيد المراجعة")

  const reasonLabel = (r) =>
    r === "refund"
      ? t("subscriber.credits.reasonRefund", "استرجاع إعلان")
      : r === "use"
      ? t("subscriber.credits.reasonUse", "شراء إعلان")
      : r === "adjust"
        ? t("subscriber.credits.reasonAdjust", "تعديل من الإدارة")
        : t("subscriber.credits.reasonPurchase", "إضافة رصيد")

  return (
    <div className="space-y-6">
      <SubscriberPageHeader
        title={t("subscriber.nav.credits", "الرصيد وطلبات الشحن")}
        subtitle={t("subscriber.credits.subtitle", "كل شراء إعلان يخصم إعلاناً واحداً. اطلب رصيداً إضافياً وستضيفه الإدارة بعد الدفع.")}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Coins className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">{t("subscriber.stats.balance", "الرصيد المتبقي")}</p>
              <p className="text-3xl font-bold tabular-nums">{isLoading ? "…" : data?.balance ?? 0}</p>
              {data?.amount_remaining_sar != null ? (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {t("subscriber.credits.amounts", {
                    paid: Math.round(data.amount_paid_sar).toLocaleString("en-US"),
                    remaining: Math.round(data.amount_remaining_sar).toLocaleString("en-US"),
                    defaultValue: "مدفوع {{paid}} ريال · متبقي {{remaining}} ريال",
                  })}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("subscriber.credits.request", "طلب رصيد")}</CardTitle>
          </CardHeader>
          <CardContent>
            {pending ? (
              <p className="rounded-lg bg-amber-500/10 p-3 text-sm">
                {t("subscriber.credits.pendingBanner", {
                  count: pending.quantity,
                  defaultValue: "طلب رصيد ({{count}} إعلان) قيد مراجعة الإدارة.",
                })}
              </p>
            ) : (
              <form
                className="grid gap-3 sm:grid-cols-[110px_130px_minmax(0,1fr)_auto] sm:items-end"
                onSubmit={(e) => {
                  e.preventDefault()
                  requestMutation.mutate()
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="credit-qty">{t("subscriber.credits.quantity", "عدد الإعلانات")}</Label>
                  <Input id="credit-qty" type="number" min={1} max={1000} dir="ltr" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="credit-amount">{t("subscriber.credits.amountPaid", "المبلغ المحوّل")}</Label>
                  <Input id="credit-amount" type="number" min={0} dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="credit-note">{t("subscriber.credits.note", "ملاحظة للإدارة (اختياري)")}</Label>
                  <Textarea id="credit-note" rows={1} className="min-h-10 resize-none" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("subscriber.credits.notePlaceholder", "مثال: تم التحويل البنكي اليوم")} />
                </div>
                <Button type="submit" className="h-10" disabled={requestMutation.isPending || !(Number(quantity) > 0)}>
                  {requestMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("subscriber.credits.send", "إرسال الطلب")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("subscriber.credits.requestsTitle", "طلبات الرصيد")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (data?.requests ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("subscriber.credits.noRequests", "لا توجد طلبات بعد")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLES[r.status])}>{statusLabel(r.status)}</span>
                  <span className="font-medium tabular-nums">
                    {t("subscriber.credits.adsCount", { count: r.approved_quantity ?? r.quantity, defaultValue: "{{count}} إعلان" })}
                  </span>
                  <span className="text-xs text-muted-foreground">{timeAgo(r.created_at, t)}</span>
                  {r.admin_note ? <span className="basis-full text-xs text-muted-foreground">{t("subscriber.credits.adminNote", "رد الإدارة")}: {r.admin_note}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("subscriber.credits.ledgerTitle", "سجل الرصيد")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (data?.ledger ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("subscriber.credits.noLedger", "لا توجد حركات بعد")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.ledger.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className={cn("w-12 shrink-0 text-center font-bold tabular-nums", c.delta > 0 ? "text-primary" : "text-destructive")} dir="ltr">
                    {c.delta > 0 ? `+${c.delta}` : c.delta}
                  </span>
                  {c.amount_sar != null ? (
                    <span className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">
                      {Math.round(c.amount_sar).toLocaleString("en-US")} {t("common.currency", "ريال")}
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate">
                      {reasonLabel(c.reason)}
                      {c.product ? (
                        <>
                          {" — "}
                          <Link className="text-primary hover:underline" to={`/subscriber/listings/${c.product.id}`}>
                            {c.product.title}
                          </Link>
                        </>
                      ) : null}
                    </p>
                    {c.note ? <p className="truncate text-xs text-muted-foreground">{c.note}</p> : null}
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground" dateTime={c.created_at}>{timeAgo(c.created_at, t)}</time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
