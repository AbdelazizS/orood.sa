import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
  const [payerBankName, setPayerBankName] = useState("")
  const [transferReference, setTransferReference] = useState("")
  const [receiptUrl, setReceiptUrl] = useState("")
  const [note, setNote] = useState("")
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const { data: balanceData } = useQuery({
    queryKey: ["account", "balance"],
    queryFn: async () => {
      const { data } = await apiClient.get("/account/balance")
      return data?.data
    },
    enabled: open,
  })

  const chargeMutation = useMutation({
    mutationFn: (payload) =>
      apiClient.post(
        "/account/balance/charge",
        payload,
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
      queryClient.invalidateQueries({ queryKey: ["account", "balance"] })
      queryClient.invalidateQueries({ queryKey: ["account", "charge-requests"] })
      setAmount("")
      setPayerBankName("")
      setTransferReference("")
      setReceiptUrl("")
      setNote("")
      onOpenChange(false)
      toast.success(t("dashboard.chargePendingApproval", "تم إرسال طلب الشحن وبانتظار موافقة الإدارة"))
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
    if (!payerBankName.trim() || !transferReference.trim()) {
      toast.error(t("dashboard.chargeProofRequired", "Please provide sender bank and transfer reference"))
      return
    }
    chargeMutation.mutate({
      amount: num,
      payer_bank_name: payerBankName.trim(),
      transfer_reference: transferReference.trim(),
      receipt_url: receiptUrl.trim() || undefined,
      note: note.trim() || undefined,
    })
  }

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const form = new FormData()
      form.append("file", file)
      const { data } = await apiClient.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return data
    },
    onSuccess: (res) => {
      const maybeUrl = res?.data?.url || res?.url || res?.data?.path || ""
      if (maybeUrl) {
        setReceiptUrl(maybeUrl)
        toast.success(t("dashboard.receiptUploaded", "Receipt uploaded"))
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

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
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium">{t("dashboard.bankTransferInstructions", "Bank transfer instructions")}</p>
            <ol className="mt-2 list-decimal space-y-1 ps-4 text-muted-foreground">
              <li>{t("dashboard.transferStep1", "Transfer to platform receiving account")}</li>
              <li>{t("dashboard.transferStep2", "Use your bank app and keep transfer proof")}</li>
              <li>{t("dashboard.transferStep3", "Submit amount + reference + receipt below")}</li>
            </ol>
            <div className="mt-3 grid gap-1 text-foreground">
              <p>{t("dashboard.bankAccountName", "Account name")}: {balanceData?.bank_transfer?.account_name ?? "—"}</p>
              <p>{t("dashboard.bankName", "Bank")}: {balanceData?.bank_transfer?.bank_name ?? "—"}</p>
              <p>{t("dashboard.withdrawBankIban", "IBAN")}: {balanceData?.bank_transfer?.iban ?? "—"}</p>
            </div>
          </div>
          <Input
            type="number"
            min="10"
            step="1"
            placeholder={`${t("dashboard.amount")} (${t("common.currency")})`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            dir={direction}
          />
          <Input
            placeholder={t("dashboard.payerBankName", "Your bank name")}
            value={payerBankName}
            onChange={(e) => setPayerBankName(e.target.value)}
            dir={direction}
          />
          <Input
            placeholder={t("dashboard.transferReference", "Transfer reference number")}
            value={transferReference}
            onChange={(e) => setTransferReference(e.target.value)}
            dir={direction}
          />
          <div className="space-y-2">
            <Input
              placeholder={t("dashboard.receiptUrl", "Receipt URL (optional)")}
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              dir={direction}
            />
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadMutation.mutate(file)
              }}
            />
          </div>
          <Input
            placeholder={t("dashboard.chargeNote", "Note (optional)")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
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
              disabled={!amount || Number(amount) < 10 || !payerBankName.trim() || !transferReference.trim() || chargeMutation.isPending}
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
