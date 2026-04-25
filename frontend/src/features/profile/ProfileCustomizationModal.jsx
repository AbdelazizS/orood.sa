import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ProfileImageUpload } from "@/components/ProfileImageUpload"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

/** Modal for profile customization: logo, cover, about me. Pass `invalidateQueryKeys` for extra refetches (e.g. public profile). */
export function ProfileCustomizationModal({ open, onOpenChange, profile, onSuccess, invalidateQueryKeys }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const [coverUrl, setCoverUrl] = useState(profile?.cover_photo_url ?? "")
  const [logoUrl, setLogoUrl] = useState(profile?.logo_url ?? profile?.avatar_url ?? "")
  const [bio, setBio] = useState(profile?.bio ?? "")

  useEffect(() => {
    if (open && profile) {
      setCoverUrl(profile.cover_photo_url ?? "")
      setLogoUrl(profile.logo_url ?? profile.avatar_url ?? "")
      setBio(profile.bio ?? "")
    }
  }, [open, profile])

  const mutation = useMutation({
    mutationFn: (payload) => apiClient.put("/profile", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] })
      await queryClient.invalidateQueries({ queryKey: ["owner-profile-detail", user?.id] })
      await queryClient.invalidateQueries({ queryKey: ["auth", "user"] })
      if (Array.isArray(invalidateQueryKeys)) {
        for (const key of invalidateQueryKeys) {
          if (Array.isArray(key) && key.length > 0) {
            await queryClient.invalidateQueries({ queryKey: key })
          }
        }
      }
      toast.success(t("profile.updated", "تم التحديث"))
      onSuccess?.()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate({
      cover_photo_url: coverUrl || null,
      logo_url: logoUrl || null,
      avatar_url: logoUrl || null,
      bio: bio || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("profile.customize", "تخصيص الملف الشخصي")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>{t("profile.backgroundCover", "صورة الخلفية")}</Label>
            <div className="mt-2">
              <ProfileImageUpload
                value={coverUrl}
                onChange={setCoverUrl}
                variant="cover"
                disabled={mutation.isPending}
              />
            </div>
          </div>
          <div>
            <Label>{t("profile.logoImage", "صورة اللوقو")}</Label>
            <div className="mt-2">
              <ProfileImageUpload
                value={logoUrl}
                onChange={setLogoUrl}
                disabled={mutation.isPending}
              />
            </div>
          </div>
          <div>
            <Label>{t("profile.aboutMe", "نبذة عني")}</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="mt-2"
              placeholder={t("profile.bioPlaceholder", "نبذة عني...")}
              disabled={mutation.isPending}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
