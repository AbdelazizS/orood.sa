import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { useAuthStore } from "@/store/useAuthStore"
import { Button } from "@/components/ui/button"
import { Home, Share2, Flag, UserCog, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { isStaffUser } from "@/lib/accountSectionPaths"
import { ShareModal } from "@/components/listing-detail/ShareModal"
import { ProfileReportDialog } from "@/components/profile/ProfileReportDialog"
import { PUBLIC_PROFILE_CONTAINER } from "@/components/profile/publicProfileLayout"

export function ProfileTopBar({ user, isOwner, onOwnerEditProfile }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const { token, user: authUser } = useAuthStore()
  const [shareOpen, setShareOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const profileUrl = typeof window !== "undefined" ? window.location.href : ""
  const shareTitle = user?.username ?? ""
  const username = String(user?.username ?? "").trim()

  const handleShare = async () => {
    const url = profileUrl
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url })
      } else {
        setShareOpen(true)
      }
    } catch (e) {
      if (e?.name !== "AbortError") {
        setShareOpen(true)
      }
    }
  }

  const showReport = Boolean(user?.id) && !isOwner
  /** Staff (admin area roles) viewing someone else's profile — link to admin user detail. */
  const showStaffManageUser =
    Boolean(token && user?.id && !isOwner && authUser && isStaffUser(authUser))

  const accountCrumb = username
    ? t("publicProfile.breadcrumbAccount", { username })
    : t("publicProfile.breadcrumbAccountFallback", "الحساب")

  return (
    <header
      dir={direction}
      className={cn(
        "sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75",
      )}
    >
      <div
        className={cn(
          PUBLIC_PROFILE_CONTAINER,
          "flex min-h-14 items-center justify-between gap-3 py-2.5 sm:gap-4",
        )}
      >
        <nav
          className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-muted-foreground"
          aria-label={t("breadcrumb.ariaLabel", "Breadcrumb navigation")}
        >
          <ol className="flex min-w-0 list-none flex-nowrap items-center gap-1.5 p-0 m-0">
            <li className="flex min-w-0 shrink-0 items-center">
              <Link
                to="/"
                className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap font-medium text-foreground hover:underline"
              >
                <Home className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>{t("publicProfile.breadcrumbHome")}</span>
              </Link>
            </li>
            <li className="flex shrink-0 items-center text-muted-foreground/70" aria-hidden="true">
              <span className="px-0.5 select-none">›</span>
            </li>
            <li className="min-w-0 flex-1 sm:flex-none">
              <span className="block truncate font-medium text-foreground sm:max-w-[min(100%,24rem)]">
                {accountCrumb}
              </span>
            </li>
          </ol>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          {isOwner && typeof onOwnerEditProfile === "function" ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-9 shrink-0 gap-1.5 px-2.5 shadow-none sm:gap-2 sm:px-3"
              onClick={() => onOwnerEditProfile()}
              aria-label={t("publicProfile.editMyProfileAria", "تعديل الملف")}
            >
              <Pencil className="size-4 shrink-0 opacity-90" aria-hidden />
              <span className="hidden text-sm font-medium sm:inline">
                {t("publicProfile.editMyProfileShort", "تعديل الملف")}
              </span>
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-2 whitespace-nowrap px-3 shadow-none sm:h-9 sm:px-3.5"
            onClick={handleShare}
          >
            <Share2 className="size-4 shrink-0 opacity-90" aria-hidden />
            <span className="text-sm font-medium">{t("publicProfile.share", "مشاركة")}</span>
          </Button>
          {showReport ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 gap-2 whitespace-nowrap px-3 shadow-none sm:px-3.5"
              onClick={() => setReportOpen(true)}
            >
              <Flag className="size-4 shrink-0 opacity-90" aria-hidden />
              <span className="text-sm font-medium">{t("common.report")}</span>
            </Button>
          ) : null}
          {showStaffManageUser ? (
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-9 gap-2 whitespace-nowrap px-3 sm:px-3.5"
              asChild
            >
              <Link to={`/admin/users/${user.id}`}>
                <UserCog className="size-4 shrink-0" aria-hidden />
                <span className="text-sm font-medium">
                  {t("publicProfile.staffManageUser", "إدارة المستخدم")}
                </span>
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={profileUrl}
        shareTitle={shareTitle}
        dialogTitle={t("publicProfile.shareProfileTitle", "مشاركة الحساب")}
      />
      <ProfileReportDialog open={reportOpen} onOpenChange={setReportOpen} reportedUserId={user?.id} />
    </header>
  )
}
