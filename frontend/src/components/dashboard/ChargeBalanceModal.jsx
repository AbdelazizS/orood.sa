import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import apiClient from "@/lib/apiClient"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export function ChargeBalanceModal({ open, onOpenChange }) {
  const [amount, setAmount] = useState("")
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { direction } = useAppDirection()

  const chargeMutation = useMutation({
    mutationFn: (amt) =>
      apiClient.post("/account/balance/charge", { amount: Number(amt) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
      queryClient.invalidateQueries({ queryKey: ["account", "balance"] })
      setAmount("")
      onOpenChange(false)
      toast.success(t("dashboard.chargeSuccess", "تم شحن الرصيد بنجاح"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const num = Number(amount)
    if (num < 10) {
      toast.error(t("dashboard.chargeMinError", "الحد الأدنى للشحن 10 ر.س"))
      return
    }
    chargeMutation.mutate(num)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t("dashboard.home.chargeBalance")}</DialogTitle>
          <DialogDescription>
            {t("dashboard.chargeDesc", "أدخل المبلغ الذي تريد إضافته إلى رصيدك. الحد الأدنى 10 ر.س")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="number"
            min="10"
            step="1"
            placeholder={`${t("dashboard.amount")} (${t("common.currency")})`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            dir={direction}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!amount || Number(amount) < 10 || chargeMutation.isPending}
            >
              {chargeMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("dashboard.addDeposit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
