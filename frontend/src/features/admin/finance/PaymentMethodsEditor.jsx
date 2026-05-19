import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import apiClient from "@/lib/apiClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { DynamicFormRenderer } from "@/components/finance/DynamicFormRenderer"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

const FIELD_TYPES = ["text", "textarea", "amount", "number", "phone", "email", "iban", "select", "checkbox", "info", "warning", "divider"]

export function PaymentMethodsEditor({ context = "charge" }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState(null)
  const [previewValues, setPreviewValues] = useState({})
  const [newField, setNewField] = useState({
    field_key: "",
    field_type: "text",
    label_ar: "",
    label_en: "",
    required: false,
  })

  const { data: methodsRaw = [], isLoading } = useQuery({
    queryKey: ["admin", "payment-methods", context],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/finance/payment-methods", { params: { context } })
      return data?.data ?? []
    },
  })

  const methods = useMemo(
    () => methodsRaw.filter((m) => m.code !== "stc_pay"),
    [methodsRaw],
  )

  const selected = useMemo(
    () => methods.find((m) => m.id === selectedId) ?? methods[0] ?? null,
    [methods, selectedId],
  )

  const fields = (selected?.fields ?? [])
    .filter((f) => f.context === context)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const saveMethodMutation = useMutation({
    mutationFn: (payload) => apiClient.put(`/admin/finance/payment-methods/${selected.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payment-methods", context] })
      toast.success(t("common.saved", "Saved"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  const addFieldMutation = useMutation({
    mutationFn: (payload) => apiClient.post(`/admin/finance/payment-methods/${selected.id}/fields`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payment-methods", context] })
      setNewField({ field_key: "", field_type: "text", label_ar: "", label_en: "", required: false })
    },
  })

  const deleteFieldMutation = useMutation({
    mutationFn: (fieldId) => apiClient.delete(`/admin/finance/payment-method-fields/${fieldId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "payment-methods", context] }),
  })

  const updateFieldMutation = useMutation({
    mutationFn: ({ fieldId, payload }) =>
      apiClient.put(`/admin/finance/payment-method-fields/${fieldId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payment-methods", context] })
      toast.success(t("common.saved", "Saved"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  const instructionsAr = selected?.instructions?.ar ?? {}
  const instructionsEn = selected?.instructions?.en ?? {}

  const updateInstructions = (locale, patch) => {
    if (!selected) return
    const next = {
      ...(selected.instructions ?? {}),
      [locale]: { ...(selected.instructions?.[locale] ?? {}), ...patch },
    }
    saveMethodMutation.mutate({ instructions: next })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!methods.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t("admin.financeOpsNoMethods", "No payment methods configured for this context.")}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {context === "charge"
              ? t("admin.financeOpsRechargeMethods", "Recharge methods")
              : context === "payout_profile"
                ? t("admin.financeOpsPayoutForm", "Seller bank form")
                : context === "order_payment"
                  ? t("admin.financeOpsOrderPaymentForm", "Transfer proof form")
                  : t("admin.financeOpsWithdrawMethods", "Withdraw methods")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {methods.map((m) => (
            <Button
              key={m.id}
              variant={selected?.id === m.id ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => setSelectedId(m.id)}
            >
              <span className="truncate">{m.name_ar || m.code}</span>
              {!m.enabled ? (
                <Badge variant="secondary" className="ms-auto shrink-0">
                  {t("admin.inactive", "Inactive")}
                </Badge>
              ) : null}
            </Button>
          ))}
        </CardContent>
      </Card>

      {selected ? (
        <div className="space-y-6">
          {!selected.enabled ? (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="pt-6 text-sm space-y-2">
                <p>{t("admin.financeMethodInactiveBanner")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin/finance-ops?tab=queues">{t("admin.financeApprovalQueues", "Approval queues")}</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin/charges">{t("admin.chargeRequests", "Charge requests")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selected.name_ar}</CardTitle>
              <CardDescription>{selected.code}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                <Label>{t("admin.enabled", "Enabled")}</Label>
                <Switch
                  checked={Boolean(selected.enabled)}
                  onCheckedChange={(enabled) => saveMethodMutation.mutate({ enabled })}
                />
              </div>
              <div>
                <Label>{t("admin.minAmount", "Min amount")}</Label>
                <Input
                  type="number"
                  defaultValue={selected.min_amount ?? ""}
                  onBlur={(e) =>
                    saveMethodMutation.mutate({ min_amount: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>{t("admin.maxAmount", "Max amount")}</Label>
                <Input
                  type="number"
                  defaultValue={selected.max_amount ?? ""}
                  onBlur={(e) =>
                    saveMethodMutation.mutate({ max_amount: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {context === "charge" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("admin.bankInstructions", "Bank instructions")}</CardTitle>
                <CardDescription>{t("admin.bankInstructionsDesc", "Shown to users before they submit a recharge request.")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t("admin.labelAr", "Arabic")}</Label>
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder={t("admin.bankAccountName", "Account name")}
                      defaultValue={instructionsAr.account_name ?? ""}
                      onBlur={(e) => updateInstructions("ar", { account_name: e.target.value })}
                    />
                    <Input
                      placeholder={t("admin.bankName", "Bank")}
                      defaultValue={instructionsAr.bank_name ?? ""}
                      onBlur={(e) => updateInstructions("ar", { bank_name: e.target.value })}
                    />
                    <Input
                      placeholder="IBAN"
                      defaultValue={instructionsAr.iban ?? ""}
                      onBlur={(e) => updateInstructions("ar", { iban: e.target.value })}
                    />
                    <Textarea
                      rows={4}
                      placeholder={t("admin.instructionSteps", "One step per line")}
                      defaultValue={(instructionsAr.steps ?? []).join("\n")}
                      onBlur={(e) =>
                        updateInstructions("ar", {
                          steps: e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>{t("admin.labelEn", "English")}</Label>
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder={t("admin.bankAccountName", "Account name")}
                      defaultValue={instructionsEn.account_name ?? ""}
                      onBlur={(e) => updateInstructions("en", { account_name: e.target.value })}
                    />
                    <Input
                      placeholder={t("admin.bankName", "Bank")}
                      defaultValue={instructionsEn.bank_name ?? ""}
                      onBlur={(e) => updateInstructions("en", { bank_name: e.target.value })}
                    />
                    <Input
                      placeholder="IBAN"
                      defaultValue={instructionsEn.iban ?? ""}
                      onBlur={(e) => updateInstructions("en", { iban: e.target.value })}
                    />
                    <Textarea
                      rows={4}
                      placeholder={t("admin.instructionSteps", "One step per line")}
                      defaultValue={(instructionsEn.steps ?? []).join("\n")}
                      onBlur={(e) =>
                        updateInstructions("en", {
                          steps: e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {context === "payout_profile" ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {t(
                  "admin.payoutFormHint",
                  "These fields appear when a seller enables direct bank transfer in Account → Payments. Submissions go to the approval queue.",
                )}
              </CardContent>
            </Card>
          ) : null}
          {context === "order_payment" ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {t(
                  "admin.orderPaymentFormHint",
                  "These fields appear on checkout when the buyer selects direct bank transfer (transfer reference, receipt file, etc.).",
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("admin.formFields", "Form fields")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field) => (
                <div key={field.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        defaultValue={field.label_ar ?? ""}
                        placeholder={t("admin.labelAr", "Label AR")}
                        onBlur={(e) => {
                          const v = e.target.value.trim()
                          if (v && v !== (field.label_ar ?? "")) {
                            updateFieldMutation.mutate({ fieldId: field.id, payload: { label_ar: v } })
                          }
                        }}
                      />
                      <Input
                        defaultValue={field.label_en ?? ""}
                        placeholder={t("admin.labelEn", "Label EN")}
                        onBlur={(e) => {
                          const v = e.target.value.trim()
                          if (v !== (field.label_en ?? "")) {
                            updateFieldMutation.mutate({ fieldId: field.id, payload: { label_en: v || null } })
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {field.field_key} · {field.field_type}
                    </p>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`req-${field.id}`}
                        checked={Boolean(field.required)}
                        onCheckedChange={(required) =>
                          updateFieldMutation.mutate({ fieldId: field.id, payload: { required } })
                        }
                      />
                      <Label htmlFor={`req-${field.id}`} className="text-xs">
                        {t("admin.fieldRequired", "Required")}
                      </Label>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive"
                    onClick={() => deleteFieldMutation.mutate(field.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}

              <div className="grid gap-2 rounded-lg border border-dashed p-3 sm:grid-cols-2">
                <Input
                  placeholder={t("admin.fieldKey", "field_key")}
                  value={newField.field_key}
                  onChange={(e) => setNewField((p) => ({ ...p, field_key: e.target.value }))}
                />
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newField.field_type}
                  onChange={(e) => setNewField((p) => ({ ...p, field_type: e.target.value }))}
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft} value={ft}>
                      {ft}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder={t("admin.labelAr", "Label AR")}
                  value={newField.label_ar}
                  onChange={(e) => setNewField((p) => ({ ...p, label_ar: e.target.value }))}
                />
                <Input
                  placeholder={t("admin.labelEn", "Label EN")}
                  value={newField.label_en}
                  onChange={(e) => setNewField((p) => ({ ...p, label_en: e.target.value }))}
                />
                <Button
                  type="button"
                  className="sm:col-span-2 gap-2"
                  disabled={!newField.field_key || !newField.label_ar || addFieldMutation.isPending}
                  onClick={() =>
                    addFieldMutation.mutate({
                      ...newField,
                      context,
                      sort_order: fields.length,
                    })
                  }
                >
                  <Plus className="size-4" />
                  {t("admin.addField", "Add field")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("admin.preview", "Preview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <DynamicFormRenderer
                fields={fields.filter((f) => !f.is_layout_block)}
                values={previewValues}
                onChange={(key, value) => setPreviewValues((p) => ({ ...p, [key]: value }))}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
