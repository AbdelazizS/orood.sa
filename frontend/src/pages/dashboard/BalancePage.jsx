import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { Wallet, Lock, Loader2, ArrowDownToLine, PlusCircle, Shield } from "lucide-react"
import { toast } from "sonner"
import { ChargeBalanceModal } from "@/components/dashboard/ChargeBalanceModal"
import { useAppDirection } from "@/providers/DirectionProvider"

export function BalancePage() {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [chargeOpen, setChargeOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [bankIban, setBankIban] = useState("")
  const [bankName, setBankName] = useState("")

  const { data: balanceData, isLoading } = useQuery({
    queryKey: ["account", "balance"],
    queryFn: async () => {
      const { data } = await apiClient.get("/account/balance")
      return data?.data
    },
    enabled: Boolean(user?.id),
  })
  const { data: chargeRequests = [] } = useQuery({
    queryKey: ["account", "charge-requests"],
    queryFn: async () => {
      const { data } = await apiClient.get("/account/charge-requests")
      return data?.data ?? []
    },
    enabled: Boolean(user?.id),
  })

  const available = balanceData?.available ?? 0
  const escrow = balanceData?.escrow ?? 0
  const withdrawable = balanceData?.withdrawable ?? 0
  const pendingWithdrawals = balanceData?.pending_withdrawals ?? 0

  const withdrawMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/account/withdraw", payload),
    onSuccess: (axiosRes) => {
      queryClient.invalidateQueries({ queryKey: ["account", "balance"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] })
      setWithdrawOpen(false)
      setWithdrawAmount("")
      setBankIban("")
      setBankName("")
      const msg = axiosRes?.data?.message
      toast.success(typeof msg === "string" && msg ? msg : t("dashboard.withdrawSuccessToast"))
    },
    onError: (err) => {
      const status = err?.response?.status
      const raw = err?.response?.data?.message
      if (status === 422) {
        toast.error(t("dashboard.withdrawInsufficient"))
        return
      }
      toast.error(typeof raw === "string" ? raw : t("common.error"))
    },
  })

  const submitWithdraw = (e) => {
    e.preventDefault()
    const amt = Number(withdrawAmount)
    if (amt < 10) {
      toast.error(t("dashboard.chargeMinError"))
      return
    }
    if (!bankIban.trim() || !bankName.trim()) {
      toast.error(t("common.error"))
      return
    }
    withdrawMutation.mutate({
      amount: amt,
      bank_iban: bankIban.trim(),
      bank_name: bankName.trim(),
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("dashboard.walletMenu")}</h1>
        <Skeleton className="h-32" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard.walletMenu")}</h1>
          <p className="mt-1 text-muted-foreground max-w-xl">{t("dashboard.walletPageIntro")}</p>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0 gap-2">
          <Link to="/dashboard/guarantee">
            <Shield className="size-4" />
            {t("dashboard.financialGuarantee")}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="gap-2" onClick={() => setChargeOpen(true)}>
          <PlusCircle className="size-4" />
          {t("dashboard.home.chargeBalance")}
        </Button>
        <Button size="sm" variant="secondary" className="gap-2" onClick={() => setWithdrawOpen(true)}>
          <ArrowDownToLine className="size-4" />
          {t("dashboard.home.withdraw")}
        </Button>
      </div>

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

      <ChargeBalanceModal open={chargeOpen} onOpenChange={setChargeOpen} />

      {chargeRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.chargeRequests", "Charge requests")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {chargeRequests.slice(0, 5).map((req) => (
              <div key={req.id} className="rounded-md border p-2">
                <div className="flex items-center justify-between">
                  <span>
                    {Number(req.amount).toLocaleString()} {t("common.currency")}
                  </span>
                  <span className="text-muted-foreground">{t(`dashboard.requestStatus.${req.status}`, req.status)}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("dashboard.payerBankName", "Your bank name")}: {req.payer_bank_name || "—"} ·{" "}
                  {t("dashboard.transferReference", "Transfer reference")}: {req.transfer_reference || "—"}
                </div>
                {req.receipt_url && (
                  <a
                    href={req.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs text-primary hover:underline"
                  >
                    {t("dashboard.viewReceipt", "View receipt")}
                  </a>
                )}
                {req.rejection_reason && (
                  <p className="mt-1 text-xs text-destructive">
                    {t("dashboard.rejectionReason", "Rejection reason")}: {req.rejection_reason}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-md" dir={direction}>
          <form onSubmit={submitWithdraw}>
            <DialogHeader>
              <DialogTitle>{t("dashboard.withdrawDialogTitle")}</DialogTitle>
              <DialogDescription>
                {t("dashboard.withdrawDialogDesc")}
                {Number(pendingWithdrawals) > 0 && (
                  <span className="mt-2 block text-amber-600 dark:text-amber-500">
                    {t("dashboard.withdrawAwaitingApproval")}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-2">
                <Label htmlFor="withdraw-amt">{t("dashboard.amount")}</Label>
                <Input
                  id="withdraw-amt"
                  type="number"
                  min="10"
                  step="1"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="withdraw-iban">{t("dashboard.withdrawBankIban")}</Label>
                <Input
                  id="withdraw-iban"
                  value={bankIban}
                  onChange={(e) => setBankIban(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="withdraw-bank">{t("dashboard.withdrawBankName")}</Label>
                <Input
                  id="withdraw-bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setWithdrawOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={withdrawMutation.isPending}>
                {withdrawMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("dashboard.home.withdraw")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
