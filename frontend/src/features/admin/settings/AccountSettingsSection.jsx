import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useUpdateAccountSettings } from "@/hooks/useAdminSettings"

export function AccountSettingsSection({ settings }) {
  const { t } = useTranslation()
  const mutation = useUpdateAccountSettings()
  const [allowCompany, setAllowCompany] = useState(Boolean(settings?.allow_company_registration ?? true))
  const [defaultRole, setDefaultRole] = useState(settings?.default_user_role ?? "buyer")
  const dirty = useMemo(
    () => allowCompany !== Boolean(settings?.allow_company_registration ?? true) || defaultRole !== (settings?.default_user_role ?? "buyer"),
    [allowCompany, defaultRole, settings]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.accountSettingsTitle", "Account defaults")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-medium">{t("admin.allowCompanyRegistration", "Allow company registration")}</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("admin.allowCompanyRegistrationHint", "Users can register company profiles after account creation.")}
            </p>
          </div>
          <Switch checked={allowCompany} onCheckedChange={setAllowCompany} />
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <Label className="text-sm font-medium">{t("admin.defaultUserRole", "Default role for new users")}</Label>
          <Select value={defaultRole} onValueChange={setDefaultRole}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buyer">{t("auth.roleBuyer", "Buyer")}</SelectItem>
              <SelectItem value="seller">{t("auth.roleSeller", "Seller")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            disabled={!dirty || mutation.isPending}
            onClick={() =>
              mutation.mutate({
                allow_company_registration: allowCompany,
                default_user_role: defaultRole,
              })
            }
          >
            {t("common.save", "Save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || mutation.isPending}
            onClick={() => {
              setAllowCompany(Boolean(settings?.allow_company_registration ?? true))
              setDefaultRole(settings?.default_user_role ?? "buyer")
            }}
          >
            {t("common.cancel", "Cancel")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

