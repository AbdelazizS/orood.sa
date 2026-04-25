import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useUpdateSecuritySettings } from "@/hooks/useAdminSettings"

export function SecuritySettingsSection({ settings }) {
  const { t } = useTranslation()
  const mutation = useUpdateSecuritySettings()
  const savedMode = settings?.mode ?? "simple"
  const [mode, setMode] = useState(savedMode)
  const isComplex = mode === "complex"

  useEffect(() => {
    setMode(savedMode)
  }, [savedMode])

  const onToggle = (checked) => {
    const nextMode = checked ? "complex" : "simple"
    setMode(nextMode)
    mutation.mutate(
      { mode: nextMode },
      {
        onError: () => {
          setMode(savedMode)
        },
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.passwordPolicyTitle", "Password policy")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-medium">{t("admin.passwordPolicyComplexToggle", "Complex security mode")}</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              {isComplex
                ? t("admin.passwordPolicyComplexHint", "8+ chars with uppercase, lowercase, number, and special character.")
                : t("admin.passwordPolicySimpleHint", "6+ chars with letters and numbers only.")}
            </p>
          </div>
          <Switch checked={isComplex} disabled={mutation.isPending} onCheckedChange={onToggle} />
        </div>
        {mutation.isError ? (
          <p className="text-xs text-destructive">
            {mutation.error?.response?.data?.message ?? t("common.error", "حدث خطأ")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

