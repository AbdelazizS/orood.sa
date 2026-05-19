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
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { DynamicFormRenderer } from "@/components/finance/DynamicFormRenderer"
import { mapFinanceApiErrors, validateDynamicFormFields } from "@/lib/finance/dynamicFieldErrors"
import {
  fetchWalletWithdrawSchema,
  submitFinancialWithdraw,
  USE_DYNAMIC_WALLET,
} from "@/services/financeService"
import { WalletMethodUnavailable } from "@/components/finance/WalletMethodUnavailable"

export function WithdrawBalanceModal({ open, onOpenChange }) {
  const [fieldValues, setFieldValues] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [selectedMethodId, setSelectedMethodId] = useState(null)
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { direction } = useAppDirection()

  const schemaQuery = useQuery({
    queryKey: ["finance", "wallet-withdraw-schema"],
    queryFn: fetchWalletWithdrawSchema,
    enabled: open,
  })

  const methods = schemaQuery.data?.methods ?? []
  const hasMethods = methods.length > 0
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

  const formFields = useMemo(() => {
    const raw = (selectedMethod?.fields ?? []).filter((f) => !f.is_layout_block)
    const seen = new Set()
    return raw.filter((f) => {
      if (seen.has(f.field_key)) return false
      seen.add(f.field_key)
      return true
    })
  }, [selectedMethod])

  const withdrawMutation = useMutation({
    mutationFn: (payload) => {
      if (useDynamic && selectedMethod) {
        return submitFinancialWithdraw({
          payment_method_id: selectedMethod.id,
          values: payload.values ?? payload,
        })
      }
      return submitFinancialWithdraw({
        amount: payload.amount,
        bank_name: payload.bank_name,
        bank_iban: payload.bank_iban,
        account_holder: payload.account_holder,
      })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["account", "balance"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
      queryClient.invalidateQueries({ queryKey: ["account", "financial-activity"] })
      queryClient.invalidateQueries({ queryKey: ["account", "financial-requests"] })
      setFieldValues({})
      onOpenChange(false)
      const msg = res?.message
      toast.success(typeof msg === "string" && msg ? msg : t("dashboard.withdrawSuccessToast"))
    },
    onError: (err) => {
      const mapped = mapFinanceApiErrors(err, t)
      if (Object.keys(mapped).length) {
        setFieldErrors(mapped)
      }
      if (err?.response?.status === 422 && !Object.keys(mapped).length) {
        toast.error(t("dashboard.withdrawInsufficient"))
        return
      }
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const validateAmount = (num) => {
    if (!Number.isFinite(num) || num < minAmount) {
      toast.error(t("dashboard.chargeMinErrorDynamic", "الحد الأدنى {{min}} ر.س", { min: minAmount }))
      return false
    }
    if (maxAmount != null && num > maxAmount) {
      toast.error(t("dashboard.chargeMaxError", "الحد الأقصى {{max}} ر.س", { max: maxAmount }))
      return false
    }
    return true
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!useDynamic || !selectedMethod) {
      toast.error(t("common.error"))
      return
    }
    const num = Number(fieldValues.amount ?? 0)
    if (!validateAmount(num)) return
    const clientErrors = validateDynamicFormFields(formFields, fieldValues, t, selectedMethod)
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors)
      return
    }
    setFieldErrors({})
    withdrawMutation.mutate({ values: fieldValues })
  }

  const withdrawDialogDescription = useMemo(() => {
    if (!selectedMethod) {
      return t("dashboard.withdrawDialogDescDynamic", "يُخصم من رصيدك القابل للسحب. الحد الأدنى {{min}} ر.س.", {
        min: minAmount,
      })
    }
    if (selectedMethod.description) {
      return selectedMethod.description
    }
    return t("dashboard.withdrawDialogDescBank", "يُخصم من رصيدك القابل للسحب. الحد الأدنى {{min}} ر.س.", {
      min: minAmount,
    })
  }, [selectedMethod, minAmount, t])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t("dashboard.home.withdraw")}</DialogTitle>
          <DialogDescription>{withdrawDialogDescription}</DialogDescription>
        </DialogHeader>

        {schemaQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasMethods ? (
          <>
            <WalletMethodUnavailable context="withdraw" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.close", "Close")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <DynamicFormRenderer
              fields={formFields}
              values={fieldValues}
              errors={fieldErrors}
              onChange={(key, value) => {
                setFieldValues((p) => ({ ...p, [key]: value }))
                setFieldErrors((prev) => {
                  if (!prev[key]) return prev
                  const next = { ...prev }
                  delete next[key]
                  return next
                })
              }}
            />
            <DialogFooter className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={withdrawMutation.isPending} className="min-h-11 w-full sm:w-auto">
                {withdrawMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("dashboard.submitWithdraw", "إرسال طلب السحب")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
