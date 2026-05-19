import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAdminSettings } from "@/hooks/useAdminSettings"
import { SecuritySettingsSection } from "@/features/admin/settings/SecuritySettingsSection"
import { AccountSettingsSection } from "@/features/admin/settings/AccountSettingsSection"
import { AuthSettingsSection } from "@/features/admin/settings/AuthSettingsSection"
import { ContentSettingsSection } from "@/features/admin/settings/ContentSettingsSection"
import { WholesaleMarketPageSettingsSection } from "@/features/admin/settings/WholesaleMarketPageSettingsSection"
import { PaymentSettingsSection } from "@/features/admin/settings/PaymentSettingsSection"
import { ContactSettingsSection } from "@/features/admin/settings/ContactSettingsSection"
import { BrandingSettingsSection } from "@/features/admin/settings/BrandingSettingsSection"
import { MailSettingsSection } from "@/features/admin/settings/MailSettingsSection"

const TAB_VALUES = ["security", "account", "auth", "content", "wholesale-page", "payments", "contact", "branding", "mail"]

export function AdminSettingsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const settingsQuery = useAdminSettings()

  const tabParam = searchParams.get("tab")
  const activeTab = TAB_VALUES.includes(tabParam) ? tabParam : "security"

  useEffect(() => {
    if (tabParam && !TAB_VALUES.includes(tabParam)) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete("tab")
        return next
      })
    }
  }, [tabParam, setSearchParams])

  if (settingsQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const settings = settingsQuery.data ?? {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.settingsTitle", "Platform settings")}</h1>
        <p className="text-muted-foreground">
          {t("admin.settingsDescription", "Manage security, account, authentication, and content defaults in one place.")}
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            if (value === "security") next.delete("tab")
            else next.set("tab", value)
            return next
          })
        }}
        className="w-full"
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="security">{t("admin.securityTitle", "Security settings")}</TabsTrigger>
          <TabsTrigger value="account">{t("admin.accountSettingsTitle", "Account defaults")}</TabsTrigger>
          <TabsTrigger value="auth">{t("admin.authSettingsTitle", "Authentication settings")}</TabsTrigger>
          <TabsTrigger value="content">{t("admin.contentSettingsTitle", "Content defaults")}</TabsTrigger>
          <TabsTrigger value="wholesale-page">{t("admin.wholesalePageTab", "Wholesale page")}</TabsTrigger>
          <TabsTrigger value="payments">{t("admin.settingsPaymentsTab", "Payments")}</TabsTrigger>
          <TabsTrigger value="contact">{t("admin.settingsContactTab", "Contact")}</TabsTrigger>
          <TabsTrigger value="branding">{t("admin.branding.tab", "Branding")}</TabsTrigger>
          <TabsTrigger value="mail">{t("admin.mailSettingsTab", "البريد")}</TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="mt-4">
          <SecuritySettingsSection settings={settings.security} />
        </TabsContent>
        <TabsContent value="account" className="mt-4">
          <AccountSettingsSection settings={settings.account} />
        </TabsContent>
        <TabsContent value="auth" className="mt-4">
          <AuthSettingsSection settings={settings.auth} />
        </TabsContent>
        <TabsContent value="content" className="mt-4">
          <ContentSettingsSection settings={settings.content} />
        </TabsContent>
        <TabsContent value="wholesale-page" className="mt-4">
          <WholesaleMarketPageSettingsSection
            key={JSON.stringify(settings.wholesale_market_page ?? null)}
            settings={settings}
          />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentSettingsSection key={JSON.stringify(settings.payments ?? null)} settings={settings} />
        </TabsContent>
        <TabsContent value="contact" className="mt-4">
          <ContactSettingsSection key={JSON.stringify(settings.contact ?? null)} settings={settings} />
        </TabsContent>
        <TabsContent value="branding" className="mt-4">
          <BrandingSettingsSection />
        </TabsContent>
        <TabsContent value="mail" className="mt-4">
          <MailSettingsSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
