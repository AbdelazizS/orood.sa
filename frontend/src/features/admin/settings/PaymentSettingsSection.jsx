import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUpdatePaymentSettings } from "@/hooks/useAdminSettings"
import { ExternalLink } from "lucide-react"

const MODULE_KEYS = [
  { key: "payments_module", labelKey: "admin.financeModulePayments", descKey: "admin.financeModulePaymentsDesc" },
  { key: "escrow", labelKey: "admin.financeModuleEscrow", descKey: "admin.financeModuleEscrowDesc" },
  { key: "financial_guarantee", labelKey: "admin.financeModuleGuarantee", descKey: "admin.financeModuleGuaranteeDesc" },
  { key: "bank_accounts", labelKey: "admin.financeModuleBank", descKey: "admin.financeModuleBankDesc" },
  { key: "cod", labelKey: "admin.financeModuleCod", descKey: "admin.financeModuleCodDesc" },
  { key: "wallet", labelKey: "admin.financeModuleWallet", descKey: "admin.financeModuleWalletDesc" },
]

export function PaymentSettingsSection({ settings }) {
  const { t } = useTranslation()
  const mutation = useUpdatePaymentSettings()
  const payments = settings?.payments ?? {}
  const methods = payments.payment_methods ?? []
  const initialModules = payments.finance_modules ?? {}

  const [moduleStates, setModuleStates] = useState(() =>
    Object.fromEntries(MODULE_KEYS.map(({ key }) => [key, Boolean(initialModules[key])])),
  )
  const [codEnabled, setCodEnabled] = useState(Boolean(payments.cod_global?.enabled))
  const [codAccept, setCodAccept] = useState(Boolean(payments.cod_global?.buyer_must_accept ?? true))
  const [codSellerToggle, setCodSellerToggle] = useState(
    Boolean(payments.cod_global?.seller_can_toggle ?? true),
  )
  const [methodStates, setMethodStates] = useState(() =>
    Object.fromEntries(methods.map((m) => [m.id, { enabled: m.enabled, instructions: m.instructions ?? {} }])),
  )

  const paymentsModuleOn = moduleStates.payments_module

  const payload = useMemo(
    () => ({
      finance_modules: Object.fromEntries(
        MODULE_KEYS.map(({ key }) => [key, Boolean(moduleStates[key])]),
      ),
      payment_methods: methods.map((m) => ({
        id: m.id,
        enabled: methodStates[m.id]?.enabled ?? m.enabled,
        instructions: methodStates[m.id]?.instructions ?? m.instructions,
      })),
      cod_global: {
        enabled: codEnabled,
        buyer_must_accept: codAccept,
        seller_can_toggle: codSellerToggle,
      },
    }),
    [methods, methodStates, codEnabled, codAccept, codSellerToggle, moduleStates],
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.financeModulesTitle", "Payment modules")}</CardTitle>
          <CardDescription>{t("admin.financeModulesDesc", "Enable platform payments for members. All off for MVP — deals via private messages.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {MODULE_KEYS.map(({ key, labelKey, descKey }) => {
            const isMaster = key === "payments_module"
            const disabled = !isMaster && !paymentsModuleOn

            return (
              <div
                key={key}
                className={`flex items-center justify-between rounded-lg border p-3 ${disabled ? "opacity-60" : ""}`}
              >
                <div className="pe-4">
                  <Label>{t(labelKey)}</Label>
                  <p className="text-xs text-muted-foreground mt-1">{t(descKey)}</p>
                </div>
                <Switch
                  checked={moduleStates[key]}
                  disabled={disabled}
                  onCheckedChange={(v) =>
                    setModuleStates((prev) => ({ ...prev, [key]: Boolean(v) }))
                  }
                />
              </div>
            )
          })}
          {!paymentsModuleOn ? (
            <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 p-3">
              {t("admin.financeModulesMvpHint", "With Payments Module off, members use private messages to complete deals. Payment settings below apply when you enable the module.")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className={!paymentsModuleOn ? "opacity-75" : undefined}>
        <CardHeader>
          <CardTitle>{t("admin.settingsPaymentsQueues", "Approval queues")}</CardTitle>
          <CardDescription>{t("admin.settingsPaymentsQueuesDesc", "Pending financial operations")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Badge variant="secondary">
            {t("admin.financialRequestsPending", "Financial requests")}: {payments.queue_counts?.financial_requests_pending ?? 0}
          </Badge>
          <Badge variant="secondary">
            {t("admin.orderTransfersPending", "Transfer receipts")}: {payments.queue_counts?.order_payments_pending ?? 0}
            {" · "}
            {t("admin.payoutProfilesPending", "Seller bank accounts")}: {payments.queue_counts?.payout_profiles_pending ?? 0}
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/charges">{t("admin.chargeRequests", "Charge requests")}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/finance-ops">
              {t("admin.financeOpsTitle", "Financial operations")} <ExternalLink className="ms-1 size-3" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/finance-ops?tab=queues">
              {t("admin.financeApprovalQueues", "Approval queues")} <ExternalLink className="ms-1 size-3" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className={!paymentsModuleOn ? "opacity-75" : undefined}>
        <CardHeader>
          <CardTitle>{t("admin.settingsPaymentsMethods", "Payment methods")}</CardTitle>
          <CardDescription>{t("admin.settingsPaymentsMethodsBankHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {methods.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{m.name_ar}</p>
                <p className="text-xs text-muted-foreground">{m.code}</p>
              </div>
              <Switch
                checked={methodStates[m.id]?.enabled ?? m.enabled}
                disabled={!paymentsModuleOn}
                onCheckedChange={(v) =>
                  setMethodStates((prev) => ({ ...prev, [m.id]: { ...prev[m.id], enabled: Boolean(v) } }))
                }
              />
            </div>
          ))}
          <p className="text-sm text-muted-foreground">
            {t("admin.settingsPaymentsBankOpsNote")}{" "}
            <Link to="/admin/finance-ops?tab=recharge" className="font-medium text-primary hover:underline">
              {t("admin.settingsPaymentsBankOpsLink")}
            </Link>
          </p>
        </CardContent>
      </Card>

      <Card className={!paymentsModuleOn ? "opacity-75" : undefined}>
        <CardHeader>
          <CardTitle>{t("admin.settingsPaymentsCod", "Cash on delivery (global)")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>{t("admin.codGlobalEnabled", "COD enabled platform-wide")}</Label>
            <Switch checked={codEnabled} disabled={!paymentsModuleOn} onCheckedChange={setCodEnabled} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>{t("admin.codBuyerMustAccept", "Buyer must accept terms at checkout")}</Label>
            <Switch checked={codAccept} disabled={!paymentsModuleOn} onCheckedChange={setCodAccept} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>{t("admin.codSellerCanToggle", "Sellers can opt in on payout setup")}</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t("admin.codSellerCanToggleDesc", "When off, sellers cannot enable COD on their listings.")}
              </p>
            </div>
            <Switch checked={codSellerToggle} disabled={!paymentsModuleOn} onCheckedChange={setCodSellerToggle} />
          </div>
        </CardContent>
      </Card>

      <Button disabled={mutation.isPending} onClick={() => mutation.mutate(payload)}>
        {t("common.save", "Save")}
      </Button>
    </div>
  )
}
