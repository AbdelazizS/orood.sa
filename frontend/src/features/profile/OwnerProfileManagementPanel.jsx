import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { UserListingsGrid } from "@/features/profile/UserListingsGrid"
import { ReviewSection } from "@/features/profile/ReviewSection"
import { ProfileEditForm } from "@/features/profile/ProfileEditForm"
import { PasswordChangeForm } from "@/features/profile/PasswordChangeForm"
import { PlusCircle, User, FileText, Package, Star } from "lucide-react"
import { getProfileQueryKey } from "@/hooks/useProfile"
import { mergeProfileCacheUser } from "@/features/profile/mergeProfileCacheUser"

/**
 * Owner-only tools (tabs: overview / account / listings / reviews).
 * Rendered below the unified public profile layout on `/profile/:me`.
 */
export function OwnerProfileManagementPanel({ identifier, profile }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const trimmed = typeof identifier === "string" ? identifier.trim() : ""
  const listings = profile?.listings ?? []
  const [activeTab, setActiveTab] = useState("overview")

  const updateMutation = useMutation({
    mutationFn: (payload) => apiClient.put("/profile", payload),
    onSuccess: async (response, variables) => {
      const queryKey = getProfileQueryKey(trimmed)
      const responseUser = response?.data?.data ?? response?.data ?? null

      queryClient.setQueryData(queryKey, (old) => {
        if (!old?.user) return old
        return {
          ...old,
          user: mergeProfileCacheUser(old.user, variables, responseUser),
        }
      })

      await queryClient.invalidateQueries({ queryKey, refetchType: "active" })

      if (variables?.name && variables.name !== profile?.name) {
        await queryClient.invalidateQueries({ queryKey: ["auth", "user"] })
      }

      toast.success(t("profile.updated", "تم تحديث الملف الشخصي"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  if (!profile) return null

  return (
    <section className="space-y-6 border-t border-border pt-8" aria-labelledby="owner-profile-management-heading">
      <h2 id="owner-profile-management-heading" className="text-start text-lg font-semibold tracking-tight">
        {t("publicProfile.accountManagement", "Account management")}
      </h2>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex h-auto min-h-11 w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
          <TabsTrigger value="overview" className="gap-2">
            <User className="size-4 shrink-0" />
            {t("profile.overview", "نظرة عامة")}
          </TabsTrigger>
          <TabsTrigger value="personal" className="gap-2">
            <FileText className="size-4 shrink-0" />
            {t("dashboard.personalData")}
          </TabsTrigger>
          <TabsTrigger value="listings" className="gap-2">
            <Package className="size-4 shrink-0" />
            {t("profile.listings", "عروضي وطلباتي")}
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <Star className="size-4 shrink-0" />
            {t("profile.reviewsOthers", "آراء الآخرين")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader className="text-start">
              <CardTitle>{t("profile.aboutMe", "نبذة عني")}</CardTitle>
            </CardHeader>
            <CardContent className="text-start">
              {profile.bio ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{profile.bio}</p>
              ) : (
                <p className="italic text-muted-foreground">{t("profile.noAbout", "لم تضف نبذة عنك بعد.")}</p>
              )}
            </CardContent>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Button variant="outline" asChild className="h-auto py-4">
              <Link to="/dashboard/account?tab=verification" className="text-start">
                <strong>{t("dashboard.verification")}</strong>
                <br />
                <span className="text-sm text-muted-foreground">{t("profile.verifyAccount", "توثيق حسابك")}</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4">
              <Link to="/dashboard/wallet?tab=guarantee" className="text-start">
                <strong>{t("dashboard.financialGuarantee")}</strong>
                <br />
                <span className="text-sm text-muted-foreground">
                  {profile.financial_guarantee > 0
                    ? t("profile.guaranteeActive", "ضمانك نشط")
                    : t("profile.addGuarantee", "أضف ضماناً مالياً")}
                </span>
              </Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader className="text-start">
              <CardTitle>{t("profile.edit", "تعديل الملف الشخصي")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("profile.editDescription", "تحديث بياناتك")}</p>
            </CardHeader>
            <CardContent>
              <ProfileEditForm
                profile={profile}
                onSubmit={(payload) => updateMutation.mutate(payload)}
                isPending={updateMutation.isPending}
                mapActive={activeTab === "personal"}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="text-start">
              <CardTitle>{t("profile.changePassword", "تغيير كلمة المرور")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("profile.changePasswordDescription", "تحديث كلمة المرور")}</p>
            </CardHeader>
            <CardContent>
              <PasswordChangeForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings" className="space-y-6">
          <div className="flex w-full justify-end">
            <Button asChild>
              <Link to="/add" className="inline-flex items-center gap-2">
                <PlusCircle className="size-4 shrink-0" />
                {t("dashboard.addOffer")}
              </Link>
            </Button>
          </div>
          <UserListingsGrid listings={listings} isOwner hideTitle />
        </TabsContent>

        <TabsContent value="reviews">
          <ReviewSection profile={profile} currentUser={user} isOwnProfile />
        </TabsContent>
      </Tabs>
    </section>
  )
}
