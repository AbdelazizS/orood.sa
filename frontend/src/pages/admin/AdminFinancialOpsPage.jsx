import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { PaymentMethodsEditor } from "@/features/admin/finance/PaymentMethodsEditor"
import { HelpCenterAdminSection } from "@/features/admin/finance/HelpCenterAdminSection"
import { OrderEditPolicySection } from "@/features/admin/finance/OrderEditPolicySection"
import { FinanceApprovalQueues } from "@/features/admin/finance/FinanceApprovalQueues"
import { PayoutProfilesQueue } from "@/features/admin/finance/PayoutProfilesQueue"
import { ExternalLink } from "lucide-react"

const TABS = ["recharge", "withdraw", "payout-form", "order-payment-form", "help", "order-edit", "queues"]

export function AdminFinancialOpsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get("tab")
  const tab = TABS.includes(tabParam) ? tabParam : "recharge"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.financeOpsTitle", "Financial operations center")}</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            {t("admin.financeOpsDesc", "Manage wallet recharge, withdrawals, help content, and order edit policies.")}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/settings?tab=payments">
            {t("admin.settingsPaymentsTab", "Payments")} <ExternalLink className="ms-1 size-3" />
          </Link>
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            if (v === "recharge") next.delete("tab")
            else next.set("tab", v)
            return next
          })
        }}
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="recharge">{t("admin.financeOpsRechargeMethods", "Recharge")}</TabsTrigger>
          <TabsTrigger value="withdraw">{t("admin.financeOpsWithdrawMethods", "Withdraw")}</TabsTrigger>
          <TabsTrigger value="payout-form">
            {t("admin.financeOpsPayoutForm", "Seller bank form")}
          </TabsTrigger>
          <TabsTrigger value="order-payment-form">
            {t("admin.financeOpsOrderPaymentForm", "Transfer proof form")}
          </TabsTrigger>
          <TabsTrigger value="help">{t("admin.financeOpsHelp", "Help center")}</TabsTrigger>
          <TabsTrigger value="order-edit">{t("admin.financeOpsOrderEdit", "Order edits")}</TabsTrigger>
          <TabsTrigger value="queues">{t("admin.financeOpsQueues", "Queues")}</TabsTrigger>
        </TabsList>

        <TabsContent value="recharge" className="mt-6">
          <PaymentMethodsEditor context="charge" />
        </TabsContent>
        <TabsContent value="withdraw" className="mt-6">
          <PaymentMethodsEditor context="withdraw" />
        </TabsContent>
        <TabsContent value="payout-form" className="mt-6">
          <PaymentMethodsEditor context="payout_profile" />
        </TabsContent>
        <TabsContent value="order-payment-form" className="mt-6">
          <PaymentMethodsEditor context="order_payment" />
        </TabsContent>
        <TabsContent value="help" className="mt-6">
          <HelpCenterAdminSection />
        </TabsContent>
        <TabsContent value="order-edit" className="mt-6">
          <OrderEditPolicySection />
        </TabsContent>
        <TabsContent value="queues" className="mt-6 space-y-8">
          <PayoutProfilesQueue />
          <FinanceApprovalQueues />
          <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
            <Button variant="outline" asChild className="h-auto py-4 justify-start">
              <Link to="/admin/charges">{t("admin.chargeRequests", "Charge requests")}</Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 justify-start">
              <Link to="/admin/withdrawals">{t("admin.withdrawals", "Withdrawals")}</Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 justify-start">
              <Link to="/admin/contact-inquiries">{t("admin.contactInquiries", "Contact inquiries")}</Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
