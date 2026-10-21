import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Link, useSearchParams } from "react-router-dom"
import {
  adminChangeSubscriberCredits,
  adminCreateSubscriber,
  adminListCreditRequests,
  adminListSubscribers,
} from "@/services/subscriberService"
import { usePermission } from "@/hooks/usePermission"
import { AdminCreditRequestsPanel } from "@/components/subscriber/AdminCreditRequestsPanel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Coins, Copy, Loader2, Plus, Search } from "lucide-react"

const EMPTY_FORM = { name: "", email: "", phone: "", password: "", credits: "10", amount: "", note: "" }

function apiError(err, t) {
  const errors = err?.response?.data?.errors ?? {}
  return Object.values(errors)[0]?.[0] ?? err?.response?.data?.message ?? t("common.errorGeneric", "حدث خطأ")
}

/**
 * Admin: subscriber accounts (hidden from customers) and their ad credits.
 */
export function AdminSubscribersPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canManage = usePermission("subscribers.manage")
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get("tab") === "requests" ? "requests" : "subscribers"
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [tempPassword, setTempPassword] = useState(null)
  const [creditsFor, setCreditsFor] = useState(null)
  const [creditsDelta, setCreditsDelta] = useState("5")
  const [creditsNote, setCreditsNote] = useState("")
  const [creditsAmount, setCreditsAmount] = useState("")

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "subscribers", search],
    queryFn: () => adminListSubscribers(search),
    enabled: canManage,
  })

  const { data: requestsData } = useQuery({
    queryKey: ["admin", "subscriber-credit-requests"],
    queryFn: () => adminListCreditRequests(),
    enabled: canManage,
    refetchInterval: 30_000,
  })
  const pendingCount = requestsData?.pendingCount ?? 0

  const createMutation = useMutation({
    mutationFn: () =>
      adminCreateSubscriber({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password || undefined,
        credits: Number(form.credits) || 0,
        amount_sar: form.amount !== "" ? Number(form.amount) : undefined,
        note: form.note.trim() || undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subscribers"] })
      const temp = res?.meta?.temporary_password
      if (temp) {
        setTempPassword(temp)
      } else {
        setCreateOpen(false)
      }
      toast.success(t("adminSubscribers.created", "تم إنشاء حساب المشترك"))
      setForm(EMPTY_FORM)
    },
    onError: (err) => toast.error(apiError(err, t)),
  })

  const creditsMutation = useMutation({
    mutationFn: () =>
      adminChangeSubscriberCredits(creditsFor.id, Number(creditsDelta), creditsNote.trim(), creditsAmount !== "" ? Number(creditsAmount) : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subscribers"] })
      toast.success(t("adminSubscribers.creditsUpdated", "تم تحديث الرصيد"))
      setCreditsFor(null)
    },
    onError: (err) => toast.error(apiError(err, t)),
  })

  if (!canManage) {
    return <p className="p-6 text-sm text-muted-foreground">{t("adminSubscribers.forbidden", "ليس لديك صلاحية")}</p>
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t("adminSubscribers.title", "حسابات المشتركين")}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("adminSubscribers.hint", "حسابات مخفية عن العملاء تشتري إعلانات العقارات التي تحتاج مسوق. كل شراء يخصم إعلاناً واحداً من الرصيد.")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/subscriber-listings">{t("adminSubscribers.listingsNav", "عروض المشتركين")}</Link>
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                setTempPassword(null)
                setForm(EMPTY_FORM)
                setCreateOpen(true)
              }}
            >
              <Plus className="size-4" aria-hidden />
              {t("adminSubscribers.add", "إضافة مشترك")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="inline-flex rounded-lg border border-border p-0.5" role="tablist">
            {[
              { id: "subscribers", label: t("adminSubscribers.nav", "المشتركون") },
              { id: "requests", label: t("adminSubscribers.requestsTab", "طلبات الرصيد"), badge: pendingCount },
            ].map((tb) => (
              <button
                key={tb.id}
                type="button"
                role="tab"
                aria-selected={tab === tb.id}
                onClick={() => setSearchParams(tb.id === "requests" ? { tab: "requests" } : {})}
                className={
                  tab === tb.id
                    ? "inline-flex min-h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                    : "inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                }
              >
                {tb.label}
                {tb.badge ? (
                  <span className="rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground tabular-nums">{tb.badge}</span>
                ) : null}
              </button>
            ))}
          </div>

          {tab === "requests" ? (
            <AdminCreditRequestsPanel />
          ) : (
          <>
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("adminSubscribers.search", "بحث بالاسم أو البريد أو الجوال")}
              className="ps-9"
            />
          </div>

          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("adminSubscribers.empty", "لا يوجد مشتركون بعد")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">{t("adminSubscribers.colName", "المشترك")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("adminSubscribers.colPhone", "الجوال")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("adminSubscribers.colBalance", "الرصيد المتبقي")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("adminSubscribers.colPurchased", "إجمالي الإعلانات المشتراة")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("adminSubscribers.colBought", "العقارات المشتراة")}</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">{r.email}</div>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums" dir="ltr">{r.phone ?? "—"}</td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums">{r.credits_balance}</td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {r.credits_purchased}
                        {r.amount_paid_sar ? (
                          <span className="block text-[11px] text-muted-foreground">
                            {Math.round(r.amount_paid_sar).toLocaleString("en-US")} {t("common.currency", "ريال")}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        <Link className="text-primary underline-offset-2 hover:underline" to={`/admin/subscriber-listings?subscriber_id=${r.id}`}>
                          {r.bought_count}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => {
                            setCreditsDelta("5")
                            setCreditsNote("")
                            setCreditsAmount("")
                            setCreditsFor(r)
                          }}
                        >
                          <Coins className="size-4" aria-hidden />
                          {t("adminSubscribers.changeCredits", "تعديل الرصيد")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </>
          )}
        </CardContent>
      </Card>

      {/* Create subscriber */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("adminSubscribers.add", "إضافة مشترك")}</DialogTitle>
            <DialogDescription>{t("adminSubscribers.addHint", "اترك كلمة المرور فارغة لإنشاء كلمة مرور مؤقتة.")}</DialogDescription>
          </DialogHeader>
          {tempPassword ? (
            <div className="space-y-3">
              <p className="text-sm">{t("adminSubscribers.tempPassword", "كلمة المرور المؤقتة (أرسلها للمشترك):")}</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
                <code className="flex-1 text-sm" dir="ltr">{tempPassword}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("adminSubscribers.copy", "نسخ")}
                  onClick={() => {
                    navigator.clipboard?.writeText(tempPassword).catch(() => {})
                    toast.success(t("adminSubscribers.copied", "تم النسخ"))
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => setCreateOpen(false)}>{t("common.close", "إغلاق")}</Button>
              </DialogFooter>
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                createMutation.mutate()
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="sub-name">{t("adminSubscribers.name", "الاسم")}</Label>
                <Input id="sub-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-email">{t("adminSubscribers.email", "البريد الإلكتروني")}</Label>
                <Input id="sub-email" type="email" dir="ltr" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sub-phone">{t("adminSubscribers.colPhone", "الجوال")}</Label>
                  <Input id="sub-phone" dir="ltr" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-credits">{t("adminSubscribers.credits", "عدد الإعلانات")}</Label>
                  <Input id="sub-credits" type="number" min={0} dir="ltr" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-amount">{t("adminSubscribers.amountPaid", "المبلغ المدفوع (ريال)")}</Label>
                <Input id="sub-amount" type="number" min={0} dir="ltr" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={t("adminSubscribers.amountDefault", "فارغ = السعر الافتراضي × العدد")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-password">{t("adminSubscribers.password", "كلمة المرور (اختياري)")}</Label>
                <PasswordInput id="sub-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-note">{t("adminSubscribers.note", "ملاحظة الدفع (اختياري)")}</Label>
                <Input id="sub-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t("adminSubscribers.notePlaceholder", "مثال: تحويل بنكي رقم…")} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("adminSubscribers.create", "إنشاء الحساب")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Change credits */}
      <Dialog open={Boolean(creditsFor)} onOpenChange={(open) => !open && setCreditsFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("adminSubscribers.changeCredits", "تعديل الرصيد")}</DialogTitle>
            <DialogDescription>
              {creditsFor?.name} — {t("adminSubscribers.colBalance", "الرصيد المتبقي")}: {creditsFor?.credits_balance}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              creditsMutation.mutate()
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="credits-delta">{t("adminSubscribers.delta", "عدد الإعلانات (+ للإضافة، − للخصم)")}</Label>
              <Input id="credits-delta" type="number" dir="ltr" required value={creditsDelta} onChange={(e) => setCreditsDelta(e.target.value)} />
            </div>
            {Number(creditsDelta) > 0 ? (
              <div className="space-y-1.5">
                <Label htmlFor="credits-amount">{t("adminSubscribers.amountPaid", "المبلغ المدفوع (ريال)")}</Label>
                <Input id="credits-amount" type="number" min={0} dir="ltr" value={creditsAmount} onChange={(e) => setCreditsAmount(e.target.value)} placeholder={t("adminSubscribers.amountDefault", "فارغ = السعر الافتراضي × العدد")} />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="credits-note">{t("adminSubscribers.note", "ملاحظة الدفع (اختياري)")}</Label>
              <Input id="credits-note" value={creditsNote} onChange={(e) => setCreditsNote(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={creditsMutation.isPending || !Number(creditsDelta)}>
                {creditsMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.save", "حفظ")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
