import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useNavigate, Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { PasswordInput } from "@/components/ui/password-input"
import { ProfileImageUpload } from "@/components/ProfileImageUpload"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import * as authService from "@/services/authService"
import { Loader2, Key, Mail } from "lucide-react"

export function ProfileEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/auth/user")
      return res?.user ?? res?.data
    },
    enabled: Boolean(user?.id),
  })

  const updateMutation = useMutation({
    mutationFn: (payload) => apiClient.put("/profile", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "user"] })
      await queryClient.invalidateQueries({ queryKey: ["profile", user.username] })
      navigate(user?.username ? `/profile/${user.username}` : "/dashboard/profile")
    },
  })

  const profile = profileData

  if (isLoading || !profile) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-8">
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.edit", "Edit Profile")}</CardTitle>
          <CardDescription>{t("profile.editDescription", "Update your profile information")}</CardDescription>
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
          <CardTitle className="flex items-center gap-2">
            <Key className="size-5" />
            {t("profile.changePassword", "Change Password")}
          </CardTitle>
          <CardDescription>{t("profile.changePasswordDescription", "Update your password")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-5" />
            {t("auth.email", "Email")}
          </CardTitle>
          <CardDescription>{t("profile.emailDescription", "Your email address. Use forgot password to change.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">{profile.email}</p>
          <Button variant="outline" size="sm" className="mt-2" asChild>
            <Link to="/forgot-password">{t("auth.forgotPassword")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileEditForm({ profile, onSubmit, isPending }) {
  const { t } = useTranslation()
  const [name, setName] = useState(profile.name ?? "")
  const [bio, setBio] = useState(profile.bio ?? "")
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "")
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(profile.cover_photo_url ?? "")
  const [cityId, setCityId] = useState(profile.city_id ?? profile.city?.id ?? null)

  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data } = await apiClient.get("/regions")
      return data?.data ?? data ?? []
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          name,
          bio: bio || null,
          avatar_url: avatarUrl || null,
          cover_photo_url: coverPhotoUrl || null,
          logo_url: avatarUrl || null,
          city_id: cityId || null,
        })
      }}
      className="space-y-6"
    >
      <div>
        <Label>{t("profile.coverPhoto", "Cover Photo")}</Label>
        <div className="mt-2">
          <ProfileImageUpload
            value={coverPhotoUrl}
            onChange={setCoverPhotoUrl}
            variant="cover"
            disabled={isPending}
          />
        </div>
      </div>
      <div>
        <Label>{t("profile.avatar", "صورة الملف الشخصي / اللوقو")}</Label>
        <div className="mt-2">
          <ProfileImageUpload value={avatarUrl} onChange={setAvatarUrl} disabled={isPending} />
        </div>
      </div>
      <div>
        <Label>{t("auth.name", "Name")}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" required />
      </div>
      <div>
        <Label>{t("profile.bio", "Bio")}</Label>
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="mt-1" placeholder={t("profile.bioPlaceholder", "نبذة عني...")} />
      </div>
      <div>
        <Label>{t("profile.city", "City")}</Label>
        <LocationCitySelect
          regions={regions}
          value={cityId}
          onChange={setCityId}
          initialRegionId={profile.city?.region?.id}
          placeholder={t("profile.selectCity", "Select city")}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.save")}
      </Button>
    </form>
  )
}

function PasswordChangeForm() {
  const { t } = useTranslation()
  const [currentPassword, setCurrentPassword] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      authService.changePassword(currentPassword, password, passwordConfirmation),
    onSuccess: () => {
      setSuccess(true)
      setCurrentPassword("")
      setPassword("")
      setPasswordConfirmation("")
    },
    onError: (err) => {
      setError(err?.response?.data?.message ?? err?.response?.data?.errors?.current_password?.[0] ?? t("auth.loginError"))
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (password !== passwordConfirmation) {
      setError(t("auth.passwordMismatch"))
      return
    }
    mutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>{t("profile.currentPassword", "Current password")}</Label>
        <PasswordInput
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          disabled={mutation.isPending}
          className="mt-1"
        />
      </div>
      <div>
        <Label>{t("auth.password", "New password")}</Label>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          disabled={mutation.isPending}
          className="mt-1"
        />
      </div>
      <div>
        <Label>{t("auth.passwordConfirm", "Confirm new password")}</Label>
        <PasswordInput
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
          required
          disabled={mutation.isPending}
          className="mt-1"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600 dark:text-green-500">{t("profile.passwordChanged", "Password changed successfully")}</p>}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("profile.changePassword", "Change Password")}
      </Button>
    </form>
  )
}

function LocationCitySelect({ regions, value, onChange, initialRegionId, placeholder }) {
  const { t } = useTranslation()
  const [regionId, setRegionId] = useState(initialRegionId ?? null)

  useEffect(() => {
    if (initialRegionId) setRegionId(initialRegionId)
  }, [initialRegionId])

  useEffect(() => {
    if (value && regions.length && !regionId) {
      const r = regions.find((r) => r.cities?.some((c) => c.id === value))
      if (r) setRegionId(r.id)
    }
  }, [value, regions, regionId])

  const cities = regionId ? (regions.find((r) => r.id === regionId)?.cities ?? []) : []

  return (
    <div className="mt-1 flex flex-col gap-2 sm:flex-row">
      <Select
        value={regionId ? String(regionId) : ""}
        onValueChange={(v) => {
          setRegionId(v ? Number(v) : null)
          onChange(null)
        }}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={t("profile.selectRegion", "Select region")} />
        </SelectTrigger>
        <SelectContent>
          {regions.map((r) => (
            <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value ? String(value) : ""}
        onValueChange={(v) => onChange(v ? Number(v) : null)}
        disabled={!regionId}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {cities.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
