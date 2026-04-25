import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import apiClient from "@/lib/apiClient"

export function AdminSecurityPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const policyQuery = useQuery({
    queryKey: ["admin", "security", "password-policy"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/security/password-policy")
      return data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (mode) => {
      const { data } = await apiClient.put("/admin/security/password-policy", { mode })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "security", "password-policy"] })
      queryClient.invalidateQueries({ queryKey: ["auth", "password-policy"] })
    },
  })

  const mode = policyQuery.data?.mode ?? "simple"
  const isComplex = mode === "complex"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.securityTitle", "Security settings")}</h1>
        <p className="text-muted-foreground">
          {t("admin.securityDescription", "Control password policy for registration and password changes.")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.passwordPolicyTitle", "Password policy")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {policyQuery.isLoading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm font-medium">
                    {t("admin.passwordPolicyComplexToggle", "Complex mode")}
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isComplex
                      ? t("admin.passwordPolicyComplexHint", "8+ chars, uppercase, lowercase, number, special.")
                      : t("admin.passwordPolicySimpleHint", "6+ chars with letters and numbers only.")}
                  </p>
                </div>
                <Switch
                  checked={isComplex}
                  disabled={updateMutation.isPending}
                  onCheckedChange={(next) => updateMutation.mutate(next ? "complex" : "simple")}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={isComplex ? "outline" : "default"}
                  disabled={updateMutation.isPending || !isComplex}
                  onClick={() => updateMutation.mutate("simple")}
                >
                  {t("admin.passwordPolicySimple", "Simple")}
                </Button>
                <Button
                  type="button"
                  variant={isComplex ? "default" : "outline"}
                  disabled={updateMutation.isPending || isComplex}
                  onClick={() => updateMutation.mutate("complex")}
                >
                  {t("admin.passwordPolicyComplex", "Complex")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

