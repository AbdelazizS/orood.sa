import { useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "@/hooks/useTranslation"
import { useAppDirection } from "@/providers/DirectionProvider"
import { useAuthStore } from "@/store/useAuthStore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MapPin, Shield, ShieldCheck, MessageSquare, Pencil, Camera, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import apiClient from "@/lib/apiClient"
import { getProfileQueryKey } from "@/hooks/useProfile"
import { PUBLIC_PROFILE_CONTAINER } from "@/components/profile/publicProfileLayout"
import { resolveImageUrl } from "@/lib/imageUrl"
import { getProfileDisplayName, getProfileLocationLine } from "@/lib/profile/locationDisplay"
import { CoverBanner } from "@/components/shared/CoverBanner"
import { AccountKindBadge } from "@/components/profile/AccountKindBadge"

function initialsFromUsername(username) {
  const s = String(username || "?").trim()
  if (!s) return "?"
  const parts = s.split(/[\s_]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).slice(0, 2).toUpperCase()
  }
  return s.slice(0, 2).toUpperCase()
}

export function ProfileCoverAvatar({ user, profileIdentifier, isOwner }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const queryClient = useQueryClient()
  const { token, user: authUser } = useAuthStore()
  const [coverOpen, setCoverOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const avatarInputRef = useRef(null)
  const coverInputRef = useRef(null)

  const hasCover = Boolean(user?.cover_url)
  const hasAvatar = Boolean(user?.avatar_url)
  const rawKey = typeof profileIdentifier === "string" ? profileIdentifier.trim() : ""

  const displayName = getProfileDisplayName(user) || t("publicProfile.unknownUser")

  const invalidateProfile = () => {
    queryClient.invalidateQueries({ queryKey: getProfileQueryKey(rawKey) })
  }

  const uploadAvatar = useMutation({
    mutationFn: async (file) => {
      const fd = new FormData()
      fd.append("avatar", file)
      await apiClient.post("/profile/avatar", fd)
    },
    onSuccess: () => {
      toast.success(t("publicProfile.avatarUpdated", "تم تحديث الصورة"))
      invalidateProfile()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const uploadCover = useMutation({
    mutationFn: async (file) => {
      const fd = new FormData()
      fd.append("cover", file)
      await apiClient.post("/profile/cover", fd)
    },
    onSuccess: () => {
      toast.success(t("publicProfile.coverUpdated", "تم تحديث الغلاف"))
      invalidateProfile()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const clearProfileImage = useMutation({
    mutationFn: async (which) => {
      if (which === "cover") {
        await apiClient.put("/profile", { cover_photo_url: null })
      } else {
        await apiClient.put("/profile", { avatar_url: null })
      }
    },
    onSuccess: (_, which) => {
      toast.success(
        which === "cover"
          ? t("publicProfile.coverRemoved", "تم حذف صورة الغلاف")
          : t("publicProfile.avatarRemoved", "تم حذف الصورة الشخصية"),
      )
      invalidateProfile()
      setConfirmRemove(null)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const showMessage = Boolean(token && authUser?.id && user?.id && authUser.id !== user.id)

  const coverSrc = resolveImageUrl(user?.cover_url)
  const avatarSrc = resolveImageUrl(user?.avatar_url)

  return (
    <div dir={direction} className={cn(PUBLIC_PROFILE_CONTAINER, "space-y-3 pb-2 pt-3")}>
      <div className="relative rounded-xl border border-border bg-card shadow-sm">
        <CoverBanner
          coverUrl={hasCover ? user?.cover_url : null}
          rounded="top"
          alt={t("publicProfile.coverAlt")}
          onCoverClick={hasCover ? () => setCoverOpen(true) : undefined}
        >
          {isOwner ? (
            <>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ""
                  if (f) uploadCover.mutate(f)
                }}
              />
              <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-end p-2 sm:p-3">
                <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="gap-1.5 border border-border/60 bg-background/95 shadow-md backdrop-blur-sm"
                    disabled={uploadCover.isPending}
                    onClick={(e) => {
                      e.stopPropagation()
                      coverInputRef.current?.click()
                    }}
                  >
                    {uploadCover.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Pencil className="size-4 shrink-0" aria-hidden />
                    )}
                    {t("publicProfile.editCoverShort", "تعديل")}
                  </Button>
                  {hasCover ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-destructive/40 bg-background/95 text-destructive shadow-md backdrop-blur-sm hover:bg-destructive/10"
                      disabled={clearProfileImage.isPending}
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmRemove("cover")
                      }}
                    >
                      <Trash2 className="size-4 shrink-0" aria-hidden />
                      {t("publicProfile.deleteCoverShort", "حذف")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </CoverBanner>

        <div className="relative rounded-b-xl border-t border-border/60 bg-card px-4 pb-4 sm:px-6">
          <div className="flex items-start gap-3 pt-3 sm:gap-4">
            <div className="relative z-10 flex shrink-0 flex-col items-center gap-2 sm:items-start">
              <div className="relative -mt-8 sm:-mt-9">
                <Avatar className="size-20 border-4 border-background shadow-md ring-1 ring-border/60">
                  {hasAvatar ? (
                    <AvatarImage src={avatarSrc} alt={displayName} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-green-600 text-sm font-bold text-white">
                    {initialsFromUsername(user?.username || user?.name)}
                  </AvatarFallback>
                </Avatar>
                {isOwner ? (
                  <>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ""
                        if (f) uploadAvatar.mutate(f)
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute -bottom-0.5 -end-0.5 size-8 rounded-full border shadow-md"
                      disabled={uploadAvatar.isPending}
                      onClick={() => avatarInputRef.current?.click()}
                      aria-label={t("publicProfile.changeAvatar", "تغيير الصورة")}
                    >
                      {uploadAvatar.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Camera className="size-3.5" />
                      )}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            <div className="min-w-0 flex-1 overflow-visible pt-0.5 sm:pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-start text-lg font-bold break-words sm:text-xl">{displayName}</h1>
                <AccountKindBadge user={user} />
                {user?.is_verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    <ShieldCheck className="h-3 w-3" />
                    {t("publicProfile.verified")}
                  </span>
                ) : null}
                {Number(user?.financial_guarantee) > 0 ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-800 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-100"
                    title={t("publicProfile.financialGuaranteeBadge")}
                  >
                    <Shield className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                    {t("publicProfile.financialGuaranteeBadge")}
                  </span>
                ) : null}
              </div>

              {getProfileLocationLine(user) ? (
                <p className="mt-1 flex items-center gap-1.5 text-start text-xs text-muted-foreground sm:text-sm">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  <span className="line-clamp-2">{getProfileLocationLine(user)}</span>
                </p>
              ) : null}

              {showMessage ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" className="gap-1.5" asChild>
                    <Link to={`/dashboard/messages?with=${user.id}`}>
                      <MessageSquare className="size-4 shrink-0" aria-hidden />
                      {t("publicProfile.messageUser")}
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {hasCover ? (
        <Dialog open={coverOpen} onOpenChange={setCoverOpen}>
          <DialogContent
            dir={direction}
            className={cn(
              "flex max-h-[92vh] w-[min(100vw-1.5rem,56rem)] max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[56rem]",
              "border-0 sm:border",
            )}
            showCloseButton
          >
            <DialogHeader className="sr-only">
              <DialogTitle>{t("publicProfile.coverAlt")}</DialogTitle>
            </DialogHeader>
            <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-auto p-2 sm:p-4">
              <img
                src={coverSrc}
                alt={t("publicProfile.coverAlt")}
                className="max-h-[min(85vh,880px)] w-full max-w-full rounded-md object-contain object-center"
                decoding="async"
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      <AlertDialog open={confirmRemove !== null} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <AlertDialogContent dir={direction} className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">
              {confirmRemove === "cover"
                ? t("publicProfile.confirmRemoveCoverTitle", "حذف صورة الغلاف؟")
                : t("publicProfile.confirmRemoveAvatarTitle", "حذف الصورة الشخصية؟")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start">
              {confirmRemove === "cover"
                ? t("publicProfile.confirmRemoveCoverBody", "سيتم إزالة الغلاف من ملفك العام.")
                : t("publicProfile.confirmRemoveAvatarBody", "سيتم إزالة الصورة ويُعرض الاختصار بدلها.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel className="mt-0">{t("common.cancel")}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={clearProfileImage.isPending}
              onClick={() => confirmRemove && clearProfileImage.mutate(confirmRemove)}
            >
              {clearProfileImage.isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.delete", "حذف")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
