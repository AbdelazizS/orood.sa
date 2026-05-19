import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Shield, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

export function GuaranteePage({ variant = "standalone" } = {}) {
  const { t } = useTranslation()
  const embedded = variant === "wallet-embedded"
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { direction } = useAppDirection()
  const [depositAmount, setDepositAmount] = useState("")
  const [refundOpen, setRefundOpen] = useState(false)

  const { data: balanceData, isLoading } = useQuery({
    queryKey: ["account", "balance"],
    queryFn: async () => {
      const { data } = await apiClient.get("/account/balance")
      return data?.data
    },
    enabled: Boolean(user?.id),
  })

  const { data: guaranteeData } = useQuery({
    queryKey: ["account", "guarantee-status"],
    queryFn: async () => {
      const { data } = await apiClient.get("/account/guarantee-status")
      return data?.data
    },
    enabled: Boolean(user?.id),
  })

  const { data: guaranteeRequests } = useQuery({
    queryKey: ["account", "guarantee-requests"],
    queryFn: async () => {
      const { data } = await apiClient.get("/account/guarantee-requests")
      return data?.data ?? []
    },
    enabled: Boolean(user?.id),
  })

  const financialGuarantee = balanceData?.financial_guarantee ?? guaranteeData?.amount ?? 0
  const canRefund = guaranteeData?.can_refund ?? false
  const pendingRequest = guaranteeRequests?.find((r) => r.status === "pending")

  const depositRequestMutation = useMutation({
    mutationFn: (amount) => apiClient.post("/account/guarantee-requests", { type: "deposit", amount: Number(amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "guarantee-requests"] })
      queryClient.invalidateQueries({ queryKey: ["account", "balance"] })
      setDepositAmount("")
      toast.success(t("guarantee.requestDepositSubmitted"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const refundRequestMutation = useMutation({
    mutationFn: () => apiClient.post("/account/guarantee-requests", { type: "refund" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "guarantee-requests"] })
      queryClient.invalidateQueries({ queryKey: ["account", "guarantee-status"] })
      setRefundOpen(false)
      toast.success(t("guarantee.requestRefundSubmitted"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6" dir={direction}>
        {!embedded && <h1 className="text-2xl font-bold">{t("dashboard.financialGuarantee")}</h1>}
        <Skeleton className="h-32" />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-6" dir={direction}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.financialGuarantee")}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">{t("dashboard.financialGuaranteeDescription")}</p>
        </div>
      )}
      {embedded && (
        <p className="text-sm text-muted-foreground max-w-2xl">{t("dashboard.financialGuaranteeDescription")}</p>
      )}

      {pendingRequest && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="py-3">
            <CardTitle className="text-base">{t("guarantee.pendingRequestTitle")}</CardTitle>
            <CardDescription>
              {pendingRequest.type === "deposit"
                ? t("guarantee.pendingRequestDeposit", { amount: Number(pendingRequest.amount).toLocaleString() })
                : t("guarantee.pendingRequestRefund")}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <Shield className="size-5 shrink-0" />
            <span>{t("guarantee.currentHoldTitle")}</span>
            {financialGuarantee > 0 && (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {Number(financialGuarantee).toLocaleString()} {t("common.currency")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t("guarantee.currentHoldSubtitle")}</p>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">{t("guarantee.depositHint")}</p>
            <p className="text-xs text-muted-foreground">{t("guarantee.requestFlowHint")}</p>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guarantee-deposit-amount" className="text-sm font-medium">
                {t("guarantee.depositAmountLabel")}
              </Label>
              <Input
                id="guarantee-deposit-amount"
                type="number"
                min="100"
                step="100"
                placeholder={t("guarantee.depositAmountPlaceholder")}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="min-w-[10rem] max-w-xs"
                disabled={Boolean(pendingRequest)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => depositRequestMutation.mutate(depositAmount)}
                disabled={
                  Boolean(pendingRequest) || !depositAmount || Number(depositAmount) < 100 || depositRequestMutation.isPending
                }
              >
                {depositRequestMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("guarantee.submitDepositRequest")}
              </Button>
              {canRefund && financialGuarantee > 0 && (
                <Button variant="outline" size="sm" onClick={() => setRefundOpen(true)} disabled={Boolean(pendingRequest) || refundRequestMutation.isPending}>
                  {refundRequestMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("guarantee.submitRefundRequest")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {guaranteeRequests?.length > 0 && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="text-base">{t("guarantee.requestHistoryTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {guaranteeRequests.slice(0, 8).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2 last:border-0">
                <span className="text-muted-foreground">
                  {r.type === "deposit" ? t("admin.guaranteeRequestTypeDeposit") : t("admin.guaranteeRequestTypeRefund")}
                  {r.amount != null ? ` · ${Number(r.amount).toLocaleString()} ${t("common.currency")}` : ""}
                </span>
                <Badge variant={r.status === "pending" ? "secondary" : r.status === "approved" ? "default" : "outline"}>
                  {t(`guarantee.requestStatus.${r.status}`, r.status)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={refundOpen} onOpenChange={setRefundOpen}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("guarantee.refundConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("guarantee.refundRequestConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => refundRequestMutation.mutate()} disabled={refundRequestMutation.isPending}>
              {refundRequestMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("guarantee.submitRefundRequest")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="max-w-2xl border-muted">
        <CardHeader>
          <CardTitle className="text-base">{t("guarantee.howItWorksTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{t("guarantee.howItWorksP1")}</p>
          <p>{t("guarantee.howItWorksP2")}</p>
          <p>{t("guarantee.howItWorksP3")}</p>
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
            <p className="font-medium text-foreground">{t("guarantee.sizingHintTitle")}</p>
            <CardDescription className="mt-1 text-sm leading-relaxed">{t("guarantee.sizingHintBody")}</CardDescription>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
