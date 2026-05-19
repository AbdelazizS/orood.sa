import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { DynamicFormRenderer } from "@/components/finance/DynamicFormRenderer"
import { fetchWalletWithdrawSchema, submitFinancialWithdraw } from "@/services/financeService"
import { useAppDirection } from "@/providers/DirectionProvider"

export function WithdrawBalanceDialog({ open, onOpenChange, withdrawable = 0 }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const queryClient = useQueryClient()
  const [fieldValues, setFieldValues] = useState({})
  const [selectedMethodId, setSelectedMethodId] = useState(null)

  const schemaQuery = useQuery({
    queryKey: ["finance", "wallet-withdraw-schema"],
    queryFn: fetchWalletWithdrawSchema,
    enabled: open,
  })

  const methods = schemaQuery.data?.methods ?? []
  const selectedMethod = useMemo(
    () => methods.find((m) => m.id === selectedMethodId) ?? methods[0] ?? null,
    [methods, selectedMethodId],
  )

  useEffect(() => {
    if (methods.length && !selectedMethodId) setSelectedMethodId(methods[0].id)
  }, [methods, selectedMethodId])

  const minAmount = selectedMethod?.min_amount ?? 10

  const mutation = useMutation({
    mutationFn: () =>
      submitFinancialWithdraw({
        payment_method_id: selectedMethod?.id,
        values: fieldValues,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "balance"] })
      queryClient.invalidateQueries({ queryKey: ["account", "financial-activity"] })
      setFieldValues({})
      onOpenChange(false)
      toast.success(t("dashboard.withdrawSuccessToast"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const amt = Number(fieldValues.amount ?? 0)
    if (amt < minAmount) {
      toast.error(t("dashboard.chargeMinErrorDynamic", "الحد الأدنى {{min}} ر.س", { min: minAmount }))
      return
    }
    if (amt > withdrawable) {
      toast.error(t("dashboard.withdrawInsufficient"))
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t("dashboard.home.withdraw")}</DialogTitle>
          <DialogDescription>
            {t("dashboard.withdrawDialogDescDynamic", "يُخصم من رصيدك القابل للسحب. الحد الأدنى {{min}} ر.س.", {
              min: minAmount,
            })}
          </DialogDescription>
        </DialogHeader>
        {schemaQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pb-safe">
            {methods.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {methods.map((m) => (
                  <Button
                    key={m.id}
                    type="button"
                    size="sm"
                    variant={m.id === selectedMethod?.id ? "default" : "outline"}
                    onClick={() => setSelectedMethodId(m.id)}
                  >
                    {m.name}
                  </Button>
                ))}
              </div>
            ) : null}
            {selectedMethod ? (
              <DynamicFormRenderer
                fields={selectedMethod.fields ?? []}
                values={fieldValues}
                onChange={(key, value) => setFieldValues((p) => ({ ...p, [key]: value }))}
              />
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="min-h-11">
                {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("dashboard.home.withdraw")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
