import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { Wallet, Lock, ArrowDownToLine, PlusCircle, Shield, Landmark } from "lucide-react"
import { ChargeBalanceModal } from "@/components/dashboard/ChargeBalanceModal"
import { WithdrawBalanceModal } from "@/components/dashboard/WithdrawBalanceModal"

/**
 * @param {{ variant?: "standalone" | "wallet-balance" | "wallet-activity" }} props
 */
export function BalancePage({ variant = "standalone" } = {}) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [chargeOpen, setChargeOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  const { data: balanceData, isLoading } = useQuery({
    queryKey: ["account", "balance"],
    queryFn: async () => {
      const { data } = await apiClient.get("/account/balance")
      return data?.data
    },
    enabled: Boolean(user?.id),
  })

  const { data: pendingChargeRequest } = useQuery({
    queryKey: ["account", "financial-requests", "pending-charge"],
    queryFn: async () => {
      const { data } = await apiClient.get("/account/financial-requests", {
        params: { type: "wallet_charge", per_page: 5 },
      })
      const rows = data?.data ?? []
      return rows.find((r) => r.status === "pending" || r.status === "under_review") ?? null
    },
    enabled: Boolean(user?.id),
  })

  const available = balanceData?.available ?? 0
  const escrow = balanceData?.escrow ?? 0
  const withdrawable = balanceData?.withdrawable ?? 0
  const pendingWithdrawals = balanceData?.pending_withdrawals ?? 0

  const isWalletBalance = variant === "wallet-balance"
  const showHeader = variant === "standalone"
  const showBalanceCore = variant === "standalone" || isWalletBalance
  const showTopActions = variant === "standalone" || isWalletBalance

  if (isLoading && showHeader) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("dashboard.walletMenu")}</h1>
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (isLoading && !showHeader) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
      </div>
    )
  }

  const balanceCards = (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-5" />
            {t("dashboard.availableBalance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {Number(available).toLocaleString()} {t("common.currency")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.availableDesc")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="size-5" />
            {t("dashboard.escrow")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {Number(escrow).toLocaleString()} {t("common.currency")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.escrowDesc")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowDownToLine className="size-5" />
            {t("dashboard.home.withdrawable")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {Number(withdrawable).toLocaleString()} {t("common.currency")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.home.withdrawableBalance")}</p>
          {Number(pendingWithdrawals) > 0 && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-500">
              {t("dashboard.pendingWithdrawalsNote", {
                amount: Number(pendingWithdrawals).toLocaleString(),
                currency: t("common.currency"),
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("dashboard.walletMenu")}</h1>
            <p className="mt-1 text-muted-foreground max-w-xl">{t("dashboard.walletPageIntro")}</p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0 gap-2">
            <Link to="/dashboard/wallet?tab=guarantee">
              <Shield className="size-4" />
              {t("dashboard.financialGuarantee")}
            </Link>
          </Button>
        </div>
      )}

      {isWalletBalance && (
        <p className="text-sm text-muted-foreground max-w-xl">{t("dashboard.walletPageIntro")}</p>
      )}

      {showTopActions && (
        <Card>
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Landmark className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-medium text-foreground">{t("finance.paymentReceivingSettings", "إعدادات استلام المدفوعات")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("finance.paymentReceivingSettingsDesc", "التحويل البنكي المباشر والدفع عند الاستلام")}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link to="/dashboard/account?tab=payments">{t("common.manage", "إدارة")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {pendingChargeRequest && showTopActions ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {t("dashboard.pendingChargeBanner", "لديك طلب شحن قيد المراجعة. سيُضاف المبلغ لرصيدك بعد موافقة الإدارة.")}
        </p>
      ) : null}

      {showTopActions && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-end">
            <Button size="sm" className="min-h-10 w-full gap-2 sm:w-auto" onClick={() => setChargeOpen(true)}>
              <PlusCircle className="size-4" />
              {t("dashboard.home.chargeBalance")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="min-h-10 w-full gap-2 sm:w-auto"
              onClick={() => setWithdrawOpen(true)}
            >
              <ArrowDownToLine className="size-4" />
              {t("dashboard.home.withdraw")}
            </Button>
          </CardContent>
        </Card>
      )}

      {showBalanceCore && balanceCards}

      <ChargeBalanceModal open={chargeOpen} onOpenChange={setChargeOpen} />
      <WithdrawBalanceModal open={withdrawOpen} onOpenChange={setWithdrawOpen} />
    </div>
  )
}
