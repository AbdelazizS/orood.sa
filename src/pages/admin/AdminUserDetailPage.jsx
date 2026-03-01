import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { VerificationBadge } from "@/components/auth/VerificationBadge"
import { ArrowRight, User, Mail, Phone, MapPin, Shield, Wallet, Check } from "lucide-react"
import { Link } from "react-router-dom"

export function AdminUserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: async () => {
      const { data: res } = await apiClient.get(`/admin/users/${id}`)
      return res?.data ?? res
    },
    enabled: !!id,
  })

  const user = data

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/admin/users")}>
          <ArrowRight className="me-2 size-4 rtl-flip" />
          {t("common.back", "رجوع")}
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{t("common.error", "حدث خطأ")}: {error?.message ?? "User not found"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const cityName = user.city
    ? (i18n.language?.startsWith("ar") && user.city.name_ar ? user.city.name_ar : user.city.name)
    : null
  const hasGuarantee = (user.financial_guarantee ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/admin/users")}>
          <ArrowRight className="me-2 size-4 rtl-flip" />
          {t("admin.backToList", "العودة للقائمة")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            {t("admin.userProfile", "ملف المستخدم")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3">
              <User className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("admin.name", "الاسم")}</p>
                <p className="font-medium">{user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("auth.email", "البريد الإلكتروني")}</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("admin.phone", "الجوال")}</p>
                <p className="font-medium">{user.phone || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("addOffer.cityLabel", "المدينة")}</p>
                <p className="font-medium">{cityName || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("admin.verificationBadge", "التوثيق")}</p>
                <VerificationBadge level={user.verification_level} size="sm" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Wallet className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("guarantee.title", "الضمان المالي")}</p>
                {hasGuarantee ? (
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-green-600" />
                    <span>{Number(user.financial_guarantee).toLocaleString()} {t("common.currency", "ر.س")}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{t(`admin.role.${user.role}`, user.role)}</Badge>
            {user.banned_at && <Badge variant="destructive">{t("admin.banned", "محظور")}</Badge>}
            {user.suspended_at && !user.banned_at && <Badge variant="secondary">{t("admin.suspended", "معلق")}</Badge>}
            {!user.banned_at && !user.suspended_at && (
              <Badge variant="outline" className="text-green-600 border-green-600">{t("admin.active", "نشط")}</Badge>
            )}
          </div>

          <div className="pt-4 border-t">
            <Button variant="outline" asChild>
              <Link to={`/users/${user.id}`}>{t("admin.viewPublicProfile", "عرض الملف العام")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
