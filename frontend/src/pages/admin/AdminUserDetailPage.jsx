import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { VerificationBadge } from "@/components/auth/VerificationBadge"
import { ArrowRight, User, Mail, Phone, MapPin, Shield, Wallet, Check } from "lucide-react"
import { Link } from "react-router-dom"
import { useAuthStore } from "@/store/useAuthStore"
import { publicProfilePath } from "@/lib/profileRoutes"
import { toast } from "sonner"

export function AdminUserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const { user: authUser } = useAuthStore()
  const [creditAmount, setCreditAmount] = useState("")
  const [creditApplyTo, setCreditApplyTo] = useState("available")
  const [creditNote, setCreditNote] = useState("")
  const [deductAmount, setDeductAmount] = useState("")
  const [deductReason, setDeductReason] = useState("")
  const [deductPurchaseId, setDeductPurchaseId] = useState("")

  const perms = authUser?.permissions ?? []
  const canCreditBalance = perms.includes("*") || perms.includes("finance.credit_balance")

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: async () => {
      const { data: res } = await apiClient.get(`/admin/users/${id}`)
      return res?.data ?? res
    },
    enabled: !!id,
  })

  const deductGuaranteeMutation = useMutation({
    mutationFn: (payload) => apiClient.post(`/admin/users/${id}/deduct-guarantee`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user", id] })
      setDeductAmount("")
      setDeductReason("")
      setDeductPurchaseId("")
      toast.success(t("admin.deductGuaranteeSuccess", "Guarantee updated"))
    },
    onError: (err) => {
      const msg = err?.response?.data?.message
      toast.error(typeof msg === "string" ? msg : t("common.error"))
    },
  })

  const creditMutation = useMutation({
    mutationFn: (payload) => apiClient.post(`/admin/users/${id}/credit-balance`, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user", id] })
      setCreditAmount("")
      setCreditNote("")
      toast.success(res?.data?.message ?? t("admin.creditBalanceSuccess"))
    },
    onError: (err) => {
      const msg = err?.response?.data?.message
      toast.error(typeof msg === "string" ? msg : t("common.error"))
    },
  })

  const user = data

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/admin/users")}>
          <ArrowRight className="me-2 size-4 rtl-flip" />
          {t("common.back", "رجوع")}
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{t("common.error", "حدث خطأ")}: {error?.message ?? "User not found"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const cityName = user.city
    ? (i18n.language?.startsWith("ar") && user.city.name_ar ? user.city.name_ar : user.city.name)
    : null
  const hasGuarantee = (user.financial_guarantee ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/admin/users")}>
          <ArrowRight className="me-2 size-4 rtl-flip" />
          {t("admin.backToList", "العودة للقائمة")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            {t("admin.userProfile", "ملف المستخدم")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3">
              <User className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("admin.name", "الاسم")}</p>
                <p className="font-medium">{user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("auth.email", "البريد الإلكتروني")}</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("admin.phone", "الجوال")}</p>
                <p className="font-medium">{user.phone || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("addOffer.cityLabel", "المدينة")}</p>
                <p className="font-medium">{cityName || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("admin.verificationBadge", "التوثيق")}</p>
                <VerificationBadge level={user.verification_level} size="sm" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Wallet className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("guarantee.title", "الضمان المالي")}</p>
                {hasGuarantee ? (
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-green-600" />
                    <span>{Number(user.financial_guarantee).toLocaleString()} {t("common.currency", "ر.س")}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{t(`admin.role.${user.role}`, user.role)}</Badge>
            {user.banned_at && <Badge variant="destructive">{t("admin.banned", "محظور")}</Badge>}
            {user.suspended_at && !user.banned_at && <Badge variant="secondary">{t("admin.suspended", "معلق")}</Badge>}
            {!user.banned_at && !user.suspended_at && (
              <Badge variant="outline" className="text-green-600 border-green-600">{t("admin.active", "نشط")}</Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button variant="outline" asChild>
              <Link to={publicProfilePath(user) ?? "/admin/users"}>{t("admin.viewPublicProfile", "عرض الملف العام")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/admin/messages?user_id=${user.id}`}>{t("admin.contactUserMessages")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasGuarantee && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.deductGuaranteeTitle", "Deduct from held guarantee")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">{t("admin.deductGuaranteeHint")}</p>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                const amt = Number(deductAmount)
                if (!amt || amt <= 0 || !deductReason.trim()) return
                deductGuaranteeMutation.mutate({
                  amount: amt,
                  reason: deductReason.trim(),
                  purchase_id: deductPurchaseId.trim() ? Number(deductPurchaseId) : undefined,
                })
              }}
            >
              <div className="space-y-1">
                <Label>{t("dashboard.amount")}</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={deductAmount}
                  onChange={(e) => setDeductAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("admin.orderIdOptional", "Order ID (optional)")}</Label>
                <Input value={deductPurchaseId} onChange={(e) => setDeductPurchaseId(e.target.value)} placeholder="—" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>{t("admin.resolutionNote", "Reason")}</Label>
                <Textarea value={deductReason} onChange={(e) => setDeductReason(e.target.value)} rows={2} required />
              </div>
              <Button type="submit" disabled={deductGuaranteeMutation.isPending}>
                {t("admin.deductGuaranteeSubmit", "Apply deduction")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {canCreditBalance && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.creditBalanceTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.balance && (
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">{t("dashboard.availableBalance")}: </span>
                  <span className="font-medium">{Number(user.balance.available ?? 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("dashboard.escrow")}: </span>
                  <span className="font-medium">{Number(user.balance.escrow ?? 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("dashboard.home.withdrawable")}: </span>
                  <span className="font-medium">{Number(user.balance.withdrawable ?? 0).toLocaleString()}</span>
                </div>
              </div>
            )}
            <form
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
              onSubmit={(e) => {
                e.preventDefault()
                const amt = Number(creditAmount)
                if (!amt || amt < 1) return
                creditMutation.mutate({
                  amount: amt,
                  apply_to: creditApplyTo,
                  note: creditNote.trim() || undefined,
                })
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="credit-amt">{t("dashboard.amount")}</Label>
                <Input
                  id="credit-amt"
                  type="number"
                  min="1"
                  step="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="w-36"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.creditApplyTo")}</Label>
                <Select value={creditApplyTo} onValueChange={setCreditApplyTo}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">{t("dashboard.availableBalance")}</SelectItem>
                    <SelectItem value="withdrawable">{t("dashboard.home.withdrawable")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-1 min-w-[200px]">
                <Label htmlFor="credit-note">{t("admin.creditNoteOptional")}</Label>
                <Input
                  id="credit-note"
                  value={creditNote}
                  onChange={(e) => setCreditNote(e.target.value)}
                  placeholder={t("admin.creditNotePlaceholder")}
                />
              </div>
              <Button type="submit" disabled={creditMutation.isPending || !creditAmount || Number(creditAmount) < 1}>
                {t("admin.creditBalanceSubmit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
