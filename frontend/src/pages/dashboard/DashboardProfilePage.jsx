import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ProfileEditForm } from "@/features/profile/ProfileEditForm"
import { PasswordChangeForm } from "@/features/profile/PasswordChangeForm"
import { EmailChangeForm } from "@/features/profile/EmailChangeForm"
import { getMyCompanyStatus } from "@/services/authService"

export function DashboardProfilePage() {
  const { t } = useTranslation()

  const { data: authUser, isLoading: profileLoading } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const { data } = await apiClient.get("/auth/user")
      return data?.user ?? null
    },
  })

  const { data: companyStatus } = useQuery({
    queryKey: ["companies", "my-status"],
    queryFn: getMyCompanyStatus,
  })

  const status = companyStatus?.status ?? "none"
  const statusVariant = status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary"

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 py-4 sm:py-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.companyVerificationTitle")}</CardTitle>
          <CardDescription>{t("dashboard.companyVerificationDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span>{t("dashboard.companyVerificationStatusLabel")}</span>
            <Badge variant={statusVariant}>{companyStatus?.status_text ?? t("dashboard.companyVerificationNone")}</Badge>
          </div>
          {companyStatus?.rejection_reason ? (
            <p className="text-destructive">{companyStatus.rejection_reason}</p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.profileMetrics.personalDataTitle")}</CardTitle>
          <CardDescription>{t("dashboard.profileMetrics.personalDataDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {profileLoading ? (
            <Skeleton className="h-44 w-full" />
          ) : (
            <ProfileEditForm profile={authUser} />
          )}
          <div className="rounded-xl border p-4">
            <h3 className="mb-4 font-semibold">{t("dashboard.profileMetrics.changePasswordTitle")}</h3>
            <PasswordChangeForm />
          </div>
          <div className="rounded-xl border p-4">
            <h3 className="mb-4 font-semibold">{t("dashboard.profileMetrics.changeEmailTitle")}</h3>
            <EmailChangeForm username={authUser?.username ?? authUser?.id} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
