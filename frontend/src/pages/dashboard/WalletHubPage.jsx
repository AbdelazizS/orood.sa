import { useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BalancePage } from "@/pages/dashboard/BalancePage"
import { GuaranteePage } from "@/pages/dashboard/GuaranteePage"
import { FinancialActivityTimeline } from "@/components/finance/FinancialActivityTimeline"
import { useFinanceModules, isWalletNavVisible, isFinancialGuaranteeVisible } from "@/hooks/useFinanceModules"
import { MessageSquare } from "lucide-react"

const WALLET_TABS = new Set(["balance", "guarantee", "activity"])

export function WalletHubPage() {
  const { t } = useTranslation()
  const { data: financeModules, isLoading } = useFinanceModules()
  const walletEnabled = isWalletNavVisible(financeModules)
  const guaranteeEnabled = isFinancialGuaranteeVisible(financeModules)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = useMemo(() => {
    const raw = (searchParams.get("tab") || "balance").toLowerCase()
    return WALLET_TABS.has(raw) ? raw : "balance"
  }, [searchParams])

  const setTab = useCallback(
    (value) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value === "balance") next.delete("tab")
          else next.set("tab", value)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  if (!isLoading && !walletEnabled) {
    return (
      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.nav.wallet")}</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("finance.modules.walletDisabledTitle", "المحفظة غير مفعّلة")}</CardTitle>
            <CardDescription>{t("finance.modules.paymentsDisabledMessage")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="gap-2">
              <Link to="/dashboard/messages">
                <MessageSquare className="size-4" />
                {t("finance.modules.goToMessages", "الذهاب إلى الرسائل")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.nav.wallet")}</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{t("dashboard.walletHubSubtitle")}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/40 p-1">
          <TabsTrigger value="balance" className="rounded-lg px-4 py-2">
            {t("dashboard.nav.walletTabBalance")}
          </TabsTrigger>
          {guaranteeEnabled ? (
            <TabsTrigger value="guarantee" className="rounded-lg px-4 py-2">
              {t("dashboard.nav.walletTabGuarantee")}
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="activity" className="rounded-lg px-4 py-2">
            {t("dashboard.nav.walletTabActivity")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="balance" className="mt-6 outline-none">
          <BalancePage variant="wallet-balance" />
        </TabsContent>
        {guaranteeEnabled ? (
          <TabsContent value="guarantee" className="mt-6 outline-none">
            <GuaranteePage variant="wallet-embedded" />
          </TabsContent>
        ) : null}
        <TabsContent value="activity" className="mt-6 outline-none">
          <FinancialActivityTimeline />
        </TabsContent>
      </Tabs>
    </div>
  )
}
