import { useEffect, useMemo, useState } from "react"
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
import { DynamicFormRenderer } from "@/components/finance/DynamicFormRenderer"
import { WalletMethodInstructions } from "@/components/finance/WalletMethodInstructions"
import {
  fetchWalletChargeSchema,
  submitFinancialCharge,
  USE_DYNAMIC_WALLET,
} from "@/services/financeService"
import { WalletMethodUnavailable } from "@/components/finance/WalletMethodUnavailable"
import { mapFinanceApiErrors, validateDynamicFormFields } from "@/lib/finance/dynamicFieldErrors"

export function ChargeBalanceModal({ open, onOpenChange }) {
  const [amount, setAmount] = useState("")
  const [payerBankName, setPayerBankName] = useState("")
  const [transferReference, setTransferReference] = useState("")
  const [receiptUrl, setReceiptUrl] = useState("")
  const [note, setNote] = useState("")
  const [fieldValues, setFieldValues] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [selectedMethodId, setSelectedMethodId] = useState(null)

  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { direction } = useAppDirection()

  const schemaQuery = useQuery({
    queryKey: ["finance", "wallet-charge-schema"],
    queryFn: fetchWalletChargeSchema,
    enabled: open,
  })

  const methods = schemaQuery.data?.methods ?? []
  const hasMethods = methods.length > 0
  const allowLegacyForm = !USE_DYNAMIC_WALLET && !hasMethods
  const useDynamic = hasMethods

  const selectedMethod = useMemo(
    () => methods.find((m) => m.id === selectedMethodId) ?? methods[0] ?? null,
    [methods, selectedMethodId],
  )

  useEffect(() => {
    if (methods.length && !selectedMethodId) {
      setSelectedMethodId(methods[0].id)
    }
  }, [methods, selectedMethodId])

  const minAmount = selectedMethod?.min_amount ?? 10
  const maxAmount = selectedMethod?.max_amount ?? null

  const chargeMutation = useMutation({
    mutationFn: async (payload) => {
      if (useDynamic && selectedMethod) {
        return submitFinancialCharge(
          {
            payment_method_id: selectedMethod.id,
            values: payload.values ?? payload,
          },
          payload.idempotencyKey,
        )
      }
      return apiClient.post("/account/balance/charge", payload, {
        headers: { "Idempotency-Key": payload.idempotencyKey },
      })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
      queryClient.invalidateQueries({ queryKey: ["account", "balance"] })
      queryClient.invalidateQueries({ queryKey: ["account", "charge-requests"] })
      queryClient.invalidateQueries({ queryKey: ["account", "financial-requests"] })
      queryClient.invalidateQueries({ queryKey: ["account", "financial-requests", "pending-charge"] })
      resetForm()
      setFieldErrors({})
      onOpenChange(false)
      const msg = res?.message
      toast.success(
        typeof msg === "string" && msg.trim()
          ? msg
          : t("dashboard.chargePendingApproval", "تم إرسال طلب الشحن وبانتظار موافقة الإدارة"),
      )
    },
    onError: (err) => {
      const mapped = mapFinanceApiErrors(err, t)
      if (Object.keys(mapped).length) {
        setFieldErrors(mapped)
      }
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const resetForm = () => {
    setAmount("")
    setPayerBankName("")
    setTransferReference("")
    setReceiptUrl("")
    setNote("")
    setFieldValues({})
    setFieldErrors({})
  }

  const uploadMutation = useMutation({
    mutationFn: async ({ file }) => {
      const form = new FormData()
      form.append("file", file)
      form.append("context", "wallet_charge")
      const { data } = await apiClient.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return data
    },
    onSuccess: (res, variables) => {
      const maybeUrl = res?.data?.url || res?.url || res?.data?.path || ""
      if (maybeUrl) {
        const key = variables?.fieldKey ?? "receipt_url"
        setFieldValues((prev) => ({ ...prev, [key]: maybeUrl }))
        if (key === "receipt_url") setReceiptUrl(maybeUrl)
        toast.success(t("dashboard.receiptUploaded", "Receipt uploaded"))
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const validateAmount = (num) => {
    if (!Number.isFinite(num) || num < minAmount) {
      toast.error(
        t("dashboard.chargeMinErrorDynamic", "الحد الأدنى للشحن {{min}} ر.س", { min: minAmount }),
      )
      return false
    }
    if (maxAmount != null && num > maxAmount) {
      toast.error(
        t("dashboard.chargeMaxError", "الحد الأقصى للشحن {{max}} ر.س", { max: maxAmount }),
      )
      return false
    }
    return true
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const idempotencyKey = crypto.randomUUID()

    if (useDynamic && selectedMethod) {
      const num = Number(fieldValues.amount ?? amount)
      if (!validateAmount(num)) return
      const formFields = (selectedMethod.fields ?? []).filter((f) => !f.is_layout_block)
      const clientErrors = validateDynamicFormFields(formFields, fieldValues, t, selectedMethod)
      if (Object.keys(clientErrors).length) {
        setFieldErrors(clientErrors)
        return
      }
      setFieldErrors({})
      chargeMutation.mutate({
        values: fieldValues,
        idempotencyKey,
      })
      return
    }

    const num = Number(amount)
    if (!validateAmount(num)) return
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
      idempotencyKey,
    })
  }

  const chargeDialogDescription = useMemo(() => {
    if (!useDynamic || !selectedMethod) {
      return t("dashboard.chargeDesc", "أدخل المبلغ الذي تريد إضافته إلى رصيدك. الحد الأدنى 10 ر.س")
    }
    if (selectedMethod.description) {
      return selectedMethod.description
    }
    const base = t("dashboard.chargeDescDynamic", "أدخل بيانات الشحن. الحد الأدنى {{min}} ر.س", {
      min: minAmount,
    })
    if (selectedMethod.processing_time) {
      return `${base} — ${selectedMethod.processing_time}`
    }
    return base
  }, [useDynamic, selectedMethod, minAmount, t])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t("dashboard.home.chargeBalance")}</DialogTitle>
          <DialogDescription>{chargeDialogDescription}</DialogDescription>
        </DialogHeader>

        {schemaQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasMethods && !allowLegacyForm ? (
          <>
            <WalletMethodUnavailable context="charge" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.close", "Close")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {useDynamic && selectedMethod ? (
              <>
                {methods.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {methods.map((m) => (
                      <Button
                        key={m.id}
                        type="button"
                        size="sm"
                        variant={m.id === selectedMethod.id ? "default" : "outline"}
                        onClick={() => setSelectedMethodId(m.id)}
                      >
                        {m.name}
                      </Button>
                    ))}
                  </div>
                ) : null}
                <WalletMethodInstructions method={selectedMethod} />
                <DynamicFormRenderer
                  fields={selectedMethod.fields ?? []}
                  values={fieldValues}
                  errors={fieldErrors}
                  uploadContext="wallet_charge"
                  fileFormatHint={t(
                    "finance.walletChargeReceiptFormats",
                    "JPG أو PNG أو PDF — حتى 10 ميجابايت",
                  )}
                  onChange={(key, value) => {
                    setFieldValues((prev) => ({ ...prev, [key]: value }))
                    setFieldErrors((prev) => {
                      if (!prev[key]) return prev
                      const next = { ...prev }
                      delete next[key]
                      return next
                    })
                  }}
                />
              </>
            ) : allowLegacyForm ? (
              <>
                <p className="rounded-md border p-3 text-sm text-muted-foreground">
                  {t("dashboard.bankTransferInstructions", "Bank transfer instructions")}
                </p>
                <Input
                  type="number"
                  min={minAmount}
                  max={maxAmount ?? undefined}
                  step="1"
                  placeholder={`${t("dashboard.amount")} (${t("common.currency")})`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  dir={direction}
                  className="min-h-11"
                />
                <Input
                  placeholder={t("dashboard.payerBankName", "Your bank name")}
                  value={payerBankName}
                  onChange={(e) => setPayerBankName(e.target.value)}
                  dir={direction}
                  className="min-h-11"
                />
                <Input
                  placeholder={t("dashboard.transferReference", "Transfer reference number")}
                  value={transferReference}
                  onChange={(e) => setTransferReference(e.target.value)}
                  dir={direction}
                  className="min-h-11"
                />
                <Input
                  placeholder={t("dashboard.receiptUrl", "Receipt URL (optional)")}
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  dir={direction}
                />
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  className="min-h-11"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadMutation.mutate({ file, fieldKey: "receipt_url" })
                  }}
                />
                <Input
                  placeholder={t("dashboard.chargeNote", "Note (optional)")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  dir={direction}
                />
              </>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={chargeMutation.isPending} className="min-h-11">
                {chargeMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  t("dashboard.addDeposit")
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
