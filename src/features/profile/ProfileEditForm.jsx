import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import apiClient from "@/lib/apiClient"
import { Loader2 } from "lucide-react"

export function ProfileEditForm({ profile, onSubmit, isPending }) {
  const { t } = useTranslation()
  const [name, setName] = useState(profile?.name ?? "")
  const [bio, setBio] = useState(profile?.bio ?? "")
  const [cityId, setCityId] = useState(profile?.city_id ?? profile?.city?.id ?? null)

  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data } = await apiClient.get("/regions")
      return data?.data ?? data ?? []
    },
  })

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "")
      setBio(profile.bio ?? "")
      setCityId(profile.city_id ?? profile.city?.id ?? null)
    }
  }, [profile])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          name,
          bio: bio || null,
          city_id: cityId || null,
        })
      }}
      className="space-y-6"
    >
      <div>
        <Label>{t("auth.name")}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" required />
      </div>
      <div>
        <Label>{t("profile.bio", "نبذة عني")}</Label>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          className="mt-1"
          placeholder={t("profile.bioPlaceholder", "نبذة عني...")}
        />
      </div>
      <div>
        <Label>{t("profile.city", "المدينة")}</Label>
        <LocationCitySelect
          regions={regions}
          value={cityId}
          onChange={setCityId}
          initialRegionId={profile?.city?.region?.id}
          placeholder={t("profile.selectCity", "اختر المدينة")}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.save")}
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
        value={regionId ? String(regionId) : "all"}
        onValueChange={(v) => {
          const id = v && v !== "all" ? Number(v) : null
          setRegionId(id)
          onChange(null)
        }}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={t("profile.selectRegion", "اختر المنطقة")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("common.all")}</SelectItem>
          {regions.map((r) => (
            <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value ? String(value) : "all"}
        onValueChange={(v) => onChange(v && v !== "all" ? Number(v) : null)}
        disabled={!regionId}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("common.all")}</SelectItem>
          {cities.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
