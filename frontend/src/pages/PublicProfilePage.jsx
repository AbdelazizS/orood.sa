import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { useProfile, useProfileListings, useProfileReviews, getProfileQueryKey } from "@/hooks/useProfile"
import { useTranslation } from "@/hooks/useTranslation"
import { useAuthStore } from "@/store/useAuthStore"
import { Button } from "@/components/ui/button"
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton"
import { ProfileTopBar } from "@/components/profile/ProfileTopBar"
import { ProfileCoverAvatar } from "@/components/profile/ProfileCoverAvatar"
import { ProfileTrustStrip } from "@/components/profile/ProfileTrustStrip"
import { ProfileBioMap } from "@/components/profile/ProfileBioMap"
import { ProfileTabs } from "@/components/profile/ProfileTabs"
import { LeaveReviewModal } from "@/components/reviews/LeaveReviewModal"
import { OwnerProfileManagementPanel } from "@/features/profile/OwnerProfileManagementPanel"
import { ProfileCustomizationModal } from "@/features/profile/ProfileCustomizationModal"
import { isProfileIdentifierNumeric } from "@/lib/profileRoutes"
import { normalizeDashboardProfile } from "@/lib/normalizeProfilePayload"
import { cn } from "@/lib/utils"
import { PUBLIC_PROFILE_CONTAINER } from "@/components/profile/publicProfileLayout"
import { getProfileLoadErrorDescription } from "@/lib/profileLoadErrors"

export function PublicProfilePage() {
  const { identifier } = useParams()
  const { t, direction } = useTranslation()
  const dir = direction
  const authUser = useAuthStore((s) => s.user)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [profileCustomizeOpen, setProfileCustomizeOpen] = useState(false)

  const rawId = typeof identifier === "string" ? identifier.trim() : ""
  const hasValidIdentifier = rawId !== "" && rawId !== "undefined" && rawId !== "null"

  const profileKey = hasValidIdentifier ? rawId : ""

  const urlIsOwnProfile =
    Boolean(authUser) &&
    hasValidIdentifier &&
    ((isProfileIdentifierNumeric(rawId) && String(authUser.id) === rawId) ||
      (!isProfileIdentifierNumeric(rawId) &&
        String(authUser.username ?? "").trim().toLowerCase() === rawId.toLowerCase()))

  const profileQuery = useProfile(profileKey)
  const listingsQuery = useProfileListings(profileKey)
  const reviewsQuery = useProfileReviews(profileKey)

  const user = profileQuery.data?.user ?? null
  const isSelfBySession =
    Boolean(authUser?.id && user?.id) && Number(authUser.id) === Number(user.id)
  const isOwner = Boolean(user?.is_owner) || urlIsOwnProfile || isSelfBySession

  const dashboardProfile = useMemo(() => {
    if (!isOwner || !profileQuery.data) return null
    return normalizeDashboardProfile(profileQuery.data, authUser)
  }, [isOwner, profileQuery.data, authUser])

  const reviewSummary = profileQuery.data?.review_summary ?? {}
  const company = profileQuery.data?.company ?? null
  const myReview = profileQuery.data?.my_review ?? null
  const initialListings = Array.isArray(profileQuery.data?.listings) ? profileQuery.data.listings : []
  const initialReviews = Array.isArray(profileQuery.data?.reviews) ? profileQuery.data.reviews : []

  if (!hasValidIdentifier) {
    return (
      <div dir={dir} className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="p-8 text-center">
          <h2 className="mb-2 text-lg font-semibold">{t("profile.not_found")}</h2>
          <p className="text-muted-foreground">{t("profile.user_not_exist")}</p>
        </div>
      </div>
    )
  }

  if (profileQuery.isLoading) return <ProfileSkeleton />
  if (profileQuery.isError) {
    return (
      <div dir={dir} className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="p-8 text-center">
          <h2 className="mb-2 text-lg font-semibold">{t("profile.error_title")}</h2>
          <p className="mb-4 text-muted-foreground">
            {getProfileLoadErrorDescription(profileQuery.error, t)}
          </p>
          <Button type="button" onClick={() => profileQuery.refetch()}>
            {t("profile.retry")}
          </Button>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div dir={dir} className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="p-8 text-center">
          <h2 className="mb-2 text-lg font-semibold">{t("profile.not_found")}</h2>
          <p className="text-muted-foreground">{t("profile.user_not_exist")}</p>
        </div>
      </div>
    )
  }

  return (
    <div dir={dir} className="min-h-screen bg-muted/30">
      <ProfileTopBar
        user={user}
        isOwner={isOwner}
        onOwnerEditProfile={isOwner && dashboardProfile ? () => setProfileCustomizeOpen(true) : undefined}
      />
      <ProfileCoverAvatar user={user} profileIdentifier={profileKey} isOwner={isOwner} />

      <div className={cn(PUBLIC_PROFILE_CONTAINER, "space-y-5 pb-16 pt-2")}>
        <ProfileTrustStrip user={user} reviewSummary={reviewSummary} />
        <ProfileBioMap user={user} company={company} isOwner={isOwner} />
      </div>

      <ProfileTabs
        profileKey={profileKey}
        user={user}
        reviewSummary={reviewSummary}
        myReview={myReview}
        isOwner={isOwner}
        listingsQuery={listingsQuery}
        reviewsQuery={reviewsQuery}
        onReviewModalOpenChange={!isOwner ? setReviewModalOpen : undefined}
        initialListings={initialListings}
        initialReviews={initialReviews}
      />

      <LeaveReviewModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        targetUser={user}
        existingReview={myReview}
        purchaseId={myReview?.purchase_id ?? null}
        profileQueryKey={getProfileQueryKey(profileKey)}
      />

      {isOwner && dashboardProfile ? (
        <div className={cn(PUBLIC_PROFILE_CONTAINER, "pb-16 pt-4")}>
          <OwnerProfileManagementPanel identifier={profileKey} profile={dashboardProfile} />
        </div>
      ) : null}

      {isOwner && dashboardProfile ? (
        <ProfileCustomizationModal
          open={profileCustomizeOpen}
          onOpenChange={setProfileCustomizeOpen}
          profile={dashboardProfile}
          invalidateQueryKeys={[getProfileQueryKey(profileKey)]}
          onSuccess={() => setProfileCustomizeOpen(false)}
        />
      ) : null}
    </div>
  )
}
