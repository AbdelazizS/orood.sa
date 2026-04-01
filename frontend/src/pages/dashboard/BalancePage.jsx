import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Wallet, Shield, Loader2, CheckCircle2, Lock } from "lucide-react"
import { toast } from "sonner"

export function BalancePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
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

  const available = balanceData?.available ?? 0
  const escrow = balanceData?.escrow ?? 0
  const financialGuarantee = balanceData?.financial_guarantee ?? guaranteeData?.amount ?? 0
  const canRefund = guaranteeData?.can_refund ?? false

  const depositMutation = useMutation({
    mutationFn: (amount) => apiClient.post("/account/deposit-guarantee", { amount: Number(amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "balance"] })
      queryClient.invalidateQueries({ queryKey: ["account", "guarantee-status"] })
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] })
      setDepositAmount("")
      toast.success(t("guarantee.deposited", "تم إضافة الضمان"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const refundMutation = useMutation({
    mutationFn: () => apiClient.post("/account/refund-guarantee"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "balance"] })
      queryClient.invalidateQueries({ queryKey: ["account", "guarantee-status"] })
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] })
      setRefundOpen(false)
      toast.success(t("guarantee.refunded", "تم استرداد الضمان إلى الرصيد"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("dashboard.balance", "الرصيد")}</h1>
        <Skeleton className="h-32" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard.balance", "الرصيد")}</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-5" />
              {t("dashboard.availableBalance", "الرصيد المتاح")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Number(available).toLocaleString("ar-SA")} ر.س</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("dashboard.availableDesc", "يمكنك سحبه بعد تأكيد الاستلام")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-5" />
              {t("dashboard.escrow", "الضمان")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Number(escrow).toLocaleString("ar-SA")} ر.س</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("dashboard.escrowDesc", "مبالغ معلقة حتى يؤكد المشتري الاستلام")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              {t("dashboard.financialGuarantee", "الضمان المالي")}
              {financialGuarantee > 0 && (
                <CheckCircle2 className="size-5 text-green-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Number(financialGuarantee).toLocaleString("ar-SA")} ر.س</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("dashboard.financialGuaranteeDescription", "مبلغ محجوز لزيادة مصداقية البائع. قابل للاسترداد عند إلغاء البيع.")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="100"
                  step="100"
                  placeholder={t("dashboard.amount", "المبلغ")}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-24"
                />
                <Button
                  size="sm"
                  onClick={() => depositMutation.mutate(depositAmount)}
                  disabled={!depositAmount || Number(depositAmount) < 100 || depositMutation.isPending}
                >
                  {depositMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("dashboard.addDeposit", "إضافة")}
                </Button>
              </div>
              {canRefund && financialGuarantee > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRefundOpen(true)}
                  disabled={refundMutation.isPending}
                >
                  {refundMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("dashboard.refundGuarantee", "استرداد")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={refundOpen} onOpenChange={setRefundOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("guarantee.refundConfirm", "استرداد الضمان المالي؟")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("guarantee.refundConfirmDesc", "سيتم تحويل المبلغ إلى رصيدك. يمكنك سحبه لاحقاً.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => refundMutation.mutate()}
              disabled={refundMutation.isPending}
            >
              {refundMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("dashboard.refundGuarantee", "استرداد")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
