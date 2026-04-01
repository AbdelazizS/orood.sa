import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { ProfileHeader } from "@/features/profile/ProfileHeader"
import { ProfileStats } from "@/features/profile/ProfileStats"
import { RatingDisplay } from "@/features/profile/RatingDisplay"
import { UserListingsGrid } from "@/features/profile/UserListingsGrid"
import { ReviewSection } from "@/features/profile/ReviewSection"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin } from "lucide-react"

export function UserProfilePage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { user: currentUser, token } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data: res } = await apiClient.get(`/users/${id}`)
      return res?.data
    },
    enabled: Boolean(id),
  })

  const profile = data
  const isOwnProfile = token && currentUser?.id === Number(id)
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
      {/* 1. Profile Header (Hero) */}
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        firstProductId={firstProduct?.id}
        firstProductTitle={firstProduct?.title}
      />

      {/* 2. Stats + Rating */}
      <div className="space-y-4">
        <ProfileStats profile={profile} />
        <RatingDisplay profile={profile} />
      </div>

      {/* Optional map placeholder — city location */}
      {profile?.city && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex aspect-video items-center justify-center bg-muted text-muted-foreground">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.city.region?.name + " " + profile.city.name)}`}
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

      {/* 3. User Listings Grid */}
      <UserListingsGrid listings={listings} />

      {/* 4. Reviews */}
      <ReviewSection
        profile={profile}
        currentUser={currentUser}
        isOwnProfile={isOwnProfile}
      />
    </div>
  )
}
