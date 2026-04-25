import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAdminSettings } from "@/hooks/useAdminSettings"
import { SecuritySettingsSection } from "@/features/admin/settings/SecuritySettingsSection"
import { AccountSettingsSection } from "@/features/admin/settings/AccountSettingsSection"
import { AuthSettingsSection } from "@/features/admin/settings/AuthSettingsSection"
import { ContentSettingsSection } from "@/features/admin/settings/ContentSettingsSection"

export function AdminSettingsPage() {
  const { t } = useTranslation()
  const settingsQuery = useAdminSettings()

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

      <Tabs defaultValue="security" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="security">{t("admin.securityTitle", "Security settings")}</TabsTrigger>
          <TabsTrigger value="account">{t("admin.accountSettingsTitle", "Account defaults")}</TabsTrigger>
          <TabsTrigger value="auth">{t("admin.authSettingsTitle", "Authentication settings")}</TabsTrigger>
          <TabsTrigger value="content">{t("admin.contentSettingsTitle", "Content defaults")}</TabsTrigger>
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
      </Tabs>
    </div>
  )
}

