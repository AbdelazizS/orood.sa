import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MapPin, Clock, MessageSquare, Phone, Pencil, Share2, Flag } from "lucide-react"
import { VerificationBadge } from "@/components/auth/VerificationBadge"
import { ContactDialog } from "@/components/chat/ContactDialog"
import { cn } from "@/lib/utils"

/**
 * ProfileHeader — premium hero section for user profile.
 * Cover image, logo/avatar, Share & Report buttons.
 */
export function ProfileHeader({ profile, isOwnProfile, firstProductId, firstProductTitle, onEditClick }) {
  const { t } = useTranslation()
  const locationText = profile?.city
    ? profile.city.region?.name
      ? `${profile.city.region.name} / ${profile.city.name}`
      : profile.city.name
    : null
  const coverUrl = profile?.cover_photo_url
  const logoUrl = profile?.logo_url ?? profile?.avatar_url

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border",
        "shadow-sm"
      )}
    >
      {/* Cover image */}
      <div className="relative h-32 sm:h-40 bg-gradient-to-br from-primary/10 via-background to-primary/5">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="relative -mt-12 sm:-mt-14 px-6 sm:px-8 pb-6 sm:pb-8">
        {/* Share & Report — top left */}
        <div className="absolute top-2 start-2 flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="shadow-md"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: profile?.name,
                  url: window.location.href,
                }).catch(() => {})
              } else {
                navigator.clipboard?.writeText(window.location.href)
              }
            }}
          >
            <Share2 className="size-4 me-1" />
            {t("profile.share", "مشاركة")}
          </Button>
          {!isOwnProfile && (
            <Button variant="outline" size="sm" className="shadow-md">
              <Flag className="size-4 me-1" />
              {t("common.report")}
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Avatar/Logo + Info */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="size-20 shrink-0 sm:size-24 ring-4 ring-background shadow-md">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="size-full object-cover" />
              ) : null}
              <AvatarFallback className="text-2xl sm:text-3xl bg-primary/10 text-primary">
                {profile?.name?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold sm:text-3xl">{profile?.name}</h1>
                <VerificationBadge
                  emailVerified={profile?.email_verified ?? profile?.is_verified}
                  level={profile?.verification_level === "company_verified" ? "blue" : profile?.verification_level === "id_verified" ? "gold" : profile?.verification_level === "email" ? "green" : "grey"}
                  size="md"
                />
                {profile?.financial_guarantee > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    {t("dashboard.financialGuarantee", "ضمان مالي")} ✓
                  </span>
                )}
              </div>
              {profile?.role && (
                <p className="mt-0.5 text-sm text-muted-foreground capitalize">
                  {profile.role.replace(/_/g, " ")}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {locationText && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4 shrink-0" />
                    {locationText}
                  </span>
                )}
                {profile?.last_seen && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-4 shrink-0" />
                    {profile.last_seen}
                  </span>
                )}
              </div>
              {profile?.bio && (
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Right: CTAs */}
          <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
            {isOwnProfile ? (
              onEditClick ? (
                <Button variant="outline" size="default" className="w-full sm:w-auto" onClick={onEditClick}>
                  <Pencil className="me-2 size-4" />
                  {t("profile.edit", "تعديل الملف")}
                </Button>
              ) : (
                <Button asChild variant="outline" size="default" className="w-full sm:w-auto">
                  <Link to="/dashboard/profile">
                    <Pencil className="me-2 size-4" />
                    {t("profile.edit", "تعديل الملف")}
                  </Link>
                </Button>
              )
            ) : (
              <>
                {firstProductId && (
                  <ContactDialog
                    productId={firstProductId}
                    productTitle={firstProductTitle ?? profile?.name}
                    trigger={
                      <Button className="w-full sm:w-auto">
                        <MessageSquare className="me-2 size-4" />
                        {t("feed.contactNow")}
                      </Button>
                    }
                  />
                )}
                {profile?.phone && (
                  <Button variant="outline" size="default" asChild className="w-full sm:w-auto">
                    <a href={`tel:${profile.phone}`}>
                      <Phone className="me-2 size-4" />
                      {t("addOffer.contactPhone")}
                    </a>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
