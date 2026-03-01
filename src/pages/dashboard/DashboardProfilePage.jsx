import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { ProfileHeader } from "@/features/profile/ProfileHeader"
import { ProfileStats } from "@/features/profile/ProfileStats"
import { RatingDisplay } from "@/features/profile/RatingDisplay"
import { UserListingsGrid } from "@/features/profile/UserListingsGrid"
import { ReviewSection } from "@/features/profile/ReviewSection"
import { ProfileCustomizationModal } from "@/features/profile/ProfileCustomizationModal"
import { ProfileEditForm } from "@/features/profile/ProfileEditForm"
import { PasswordChangeForm } from "@/features/profile/PasswordChangeForm"
import { MapPin, PlusCircle, User, FileText, Package, Star } from "lucide-react"

/**
 * Dashboard Profile Page (الحساب العضو الداخلي)
 * Full profile with customization, personal info, listings, reviews.
 */
export function DashboardProfilePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [customizationOpen, setCustomizationOpen] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/users/${user.id}`)
      return data?.data
    },
    enabled: Boolean(user?.id),
  })

  const updateMutation = useMutation({
    mutationFn: (payload) => apiClient.put("/profile", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] })
      await queryClient.invalidateQueries({ queryKey: ["auth", "user"] })
      toast.success(t("profile.updated", "تم تحديث الملف الشخصي"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const listings = profile?.listings ?? []
  const firstProduct = listings[0]

  if (isLoading || !profile) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-8">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8">
      {/* 1. Profile Header */}
      <ProfileHeader
        profile={profile}
        isOwnProfile
        firstProductId={firstProduct?.id}
        firstProductTitle={firstProduct?.title}
        onEditClick={() => setCustomizationOpen(true)}
      />

      {/* 2. Stats + Rating */}
      <div className="space-y-4">
        <ProfileStats profile={profile} />
        <RatingDisplay profile={profile} />
      </div>

      {/* Optional map */}
      {profile?.city && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex aspect-video items-center justify-center bg-muted text-muted-foreground">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  (profile.city.region?.name ?? "") + " " + (profile.city.name ?? "")
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <MapPin className="size-4" />
                {profile.city.region?.name} / {profile.city.name} — {t("profile.viewOnMap", "عرض على الخريطة")}
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* 3. Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-2">
          <TabsTrigger value="overview" className="gap-2">
            <User className="size-4" />
            {t("profile.overview", "نظرة عامة")}
          </TabsTrigger>
          <TabsTrigger value="personal" className="gap-2">
            <FileText className="size-4" />
            {t("dashboard.personalData")}
          </TabsTrigger>
          <TabsTrigger value="listings" className="gap-2">
            <Package className="size-4" />
            {t("profile.listings", "عروضي وطلباتي")}
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <Star className="size-4" />
            {t("profile.reviewsOthers", "آراء الآخرين")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.aboutMe", "نبذة عني")}</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.bio ? (
                <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
              ) : (
                <p className="text-muted-foreground italic">{t("profile.noAbout", "لم تضف نبذة عنك بعد.")}</p>
              )}
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setCustomizationOpen(true)}>
                {t("profile.edit", "تعديل")}
              </Button>
            </CardContent>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Button variant="outline" asChild className="h-auto py-4">
              <Link to="/dashboard/verification">
                <span className="text-start">
                  <strong>{t("dashboard.verification")}</strong>
                  <br />
                  <span className="text-sm text-muted-foreground">{t("profile.verifyAccount", "توثيق حسابك")}</span>
                </span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4">
              <Link to="/dashboard/balance">
                <span className="text-start">
                  <strong>{t("dashboard.financialGuarantee")}</strong>
                  <br />
                  <span className="text-sm text-muted-foreground">
                    {profile.financial_guarantee > 0
                      ? t("profile.guaranteeActive", "ضمانك نشط")
                      : t("profile.addGuarantee", "أضف ضماناً مالياً")}
                  </span>
                </span>
              </Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.edit", "تعديل الملف الشخصي")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("profile.editDescription", "تحديث بياناتك")}</p>
            </CardHeader>
            <CardContent>
              <ProfileEditForm
                profile={profile}
                onSubmit={(payload) => updateMutation.mutate(payload)}
                isPending={updateMutation.isPending}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.changePassword", "تغيير كلمة المرور")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("profile.changePasswordDescription", "تحديث كلمة المرور")}</p>
            </CardHeader>
            <CardContent>
              <PasswordChangeForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.changeEmail", "تغيير البريد الإلكتروني")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("profile.emailDescription", "بريدك الحالي")}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{profile.email}</p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link to="/forgot-password">{t("auth.forgotPassword")}</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings" className="space-y-6">
          <div className="flex justify-end">
            <Button asChild>
              <Link to="/add">
                <PlusCircle className="me-2 size-4" />
                {t("dashboard.addOffer")}
              </Link>
            </Button>
          </div>
          <UserListingsGrid listings={listings} isOwner />
        </TabsContent>

        <TabsContent value="reviews">
          <ReviewSection profile={profile} currentUser={user} isOwnProfile />
        </TabsContent>
      </Tabs>

      <ProfileCustomizationModal
        open={customizationOpen}
        onOpenChange={setCustomizationOpen}
        profile={profile}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["profile", user.id] })
          setCustomizationOpen(false)
        }}
      />
    </div>
  )
}
