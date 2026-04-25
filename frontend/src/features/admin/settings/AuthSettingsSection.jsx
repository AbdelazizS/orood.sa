import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useUpdateAuthSettings } from "@/hooks/useAdminSettings"

export function AuthSettingsSection({ settings }) {
  const { t } = useTranslation()
  const mutation = useUpdateAuthSettings()
  const initial = Boolean(settings?.email_verification_required ?? false)
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(initial)
  const dirty = emailVerificationRequired !== initial

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.authSettingsTitle", "Authentication settings")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-medium">{t("admin.emailVerificationRequired", "Require verified email before login")}</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("admin.emailVerificationRequiredHint", "If enabled, unverified users cannot sign in.")}
            </p>
          </div>
          <Switch checked={emailVerificationRequired} onCheckedChange={setEmailVerificationRequired} />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={!dirty || mutation.isPending}
            onClick={() => mutation.mutate({ email_verification_required: emailVerificationRequired })}
          >
            {t("common.save", "Save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || mutation.isPending}
            onClick={() => setEmailVerificationRequired(initial)}
          >
            {t("common.cancel", "Cancel")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

