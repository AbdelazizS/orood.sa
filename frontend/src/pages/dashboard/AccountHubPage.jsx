import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardProfilePage } from "@/pages/dashboard/DashboardProfilePage"
import { VerificationPage } from "@/pages/dashboard/VerificationPage"
import { DashboardReportsPage } from "@/pages/dashboard/DashboardReportsPage"
import { PaymentSetupPage } from "@/pages/dashboard/PaymentSetupPage"
import { useAuthStore } from "@/store/useAuthStore"
import { publicProfilePath } from "@/lib/profileRoutes"
import { ExternalLink } from "lucide-react"

const ACCOUNT_TABS = new Set(["profile", "verification", "reports", "settings", "payments"])

export function AccountHubPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = useMemo(() => {
    const raw = (searchParams.get("tab") || "profile").toLowerCase()
    return ACCOUNT_TABS.has(raw) ? raw : "profile"
  }, [searchParams])

  const setTab = useCallback(
    (value) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value === "profile") next.delete("tab")
          else next.set("tab", value)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const profileHref = publicProfilePath(user) ?? "/dashboard"

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.nav.account")}</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{t("dashboard.accountHubSubtitle")}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/40 p-1">
          <TabsTrigger value="profile" className="rounded-lg px-3 py-2 text-xs sm:text-sm">
            {t("dashboard.nav.accountTabProfile")}
          </TabsTrigger>
          <TabsTrigger value="verification" className="rounded-lg px-3 py-2 text-xs sm:text-sm">
            {t("dashboard.nav.accountTabVerification")}
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-lg px-3 py-2 text-xs sm:text-sm">
            {t("dashboard.nav.accountTabReports")}
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg px-3 py-2 text-xs sm:text-sm">
            {t("dashboard.nav.accountTabSettings")}
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg px-3 py-2 text-xs sm:text-sm">
            {t("dashboard.nav.accountTabPayments", "المدفوعات")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 outline-none">
          <DashboardProfilePage />
        </TabsContent>
        <TabsContent value="verification" className="mt-6 outline-none">
          <VerificationPage />
        </TabsContent>
        <TabsContent value="reports" className="mt-6 outline-none">
          <DashboardReportsPage />
        </TabsContent>
        <TabsContent value="payments" className="mt-6 outline-none">
          <PaymentSetupPage embedded />
        </TabsContent>
        <TabsContent value="settings" className="mt-6 outline-none">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.nav.accountTabSettings")}</CardTitle>
              <CardDescription>{t("dashboard.accountSettingsHubDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild className="gap-2">
                <Link to={profileHref}>
                  <ExternalLink className="size-4" />
                  {t("dashboard.accountOpenPublicProfile")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
