import { useState, useEffect, useRef, useCallback } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import apiClient from "@/lib/apiClient"
import { Loader2 } from "lucide-react"
import { EditableLocationMapField } from "@/components/location/EditableLocationMapField"
import { LocationCitySelect } from "@/components/location/LocationCitySelect"
import { resolveCityIdFromName } from "@/lib/maps/resolveCityFromGeocode"
import { profileFieldsKey } from "@/features/profile/profileFormSync"
import { toast } from "sonner"

export function ProfileEditForm({ profile, onSubmit, isPending: isPendingProp, mapActive = true }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const cityIdRef = useRef(null)
  const syncedFieldsKeyRef = useRef("")

  const [name, setName] = useState(profile?.name ?? "")
  const [bio, setBio] = useState(profile?.bio ?? "")
  const [cityId, setCityId] = useState(profile?.city_id ?? profile?.city?.id ?? null)
  const [locationLat, setLocationLat] = useState(profile?.location_lat ?? null)
  const [locationLng, setLocationLng] = useState(profile?.location_lng ?? null)
  const [locationAddress, setLocationAddress] = useState(profile?.location_address ?? "")

  cityIdRef.current = cityId

  const localMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.put("/profile", payload)
      return data
    },
    onSuccess: async () => {
      toast.success(t("dashboard.profileMetrics.personalDataSaved"))
      await queryClient.invalidateQueries({ queryKey: ["profile"] })
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message ??
        Object.values(err?.response?.data?.errors ?? {}).flat()[0] ??
        t("common.error")
      toast.error(msg)
    },
  })

  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data } = await apiClient.get("/regions")
      return data?.data ?? data ?? []
    },
  })

  useEffect(() => {
    if (!profile) return
    const key = profileFieldsKey(profile)
    if (key === syncedFieldsKeyRef.current) return
    syncedFieldsKeyRef.current = key
    setName(profile.name ?? "")
    setBio(profile.bio ?? "")
    setCityId(profile.city_id ?? profile.city?.id ?? null)
    setLocationLat(profile.location_lat ?? null)
    setLocationLng(profile.location_lng ?? null)
    setLocationAddress(profile.location_address ?? "")
  }, [profile])

  const applyGeocodeDetail = useCallback(
    (detail) => {
      if (!detail) return
      if (detail.placeName) {
        setLocationAddress(detail.placeName)
      }
      if (!cityIdRef.current && detail.cityName && regions.length) {
        const resolved = resolveCityIdFromName(detail.cityName, regions)
        if (resolved) setCityId(resolved)
      }
    },
    [regions]
  )

  const handleLocationChange = useCallback(({ lat, lng }) => {
    setLocationLat(lat)
    setLocationLng(lng)
  }, [])

  const handleGeocodeResolved = useCallback(
    (detail) => {
      applyGeocodeDetail(detail)
    },
    [applyGeocodeDetail]
  )

  const handlePlaceResolved = useCallback((label) => {
    const text = typeof label === "string" ? label.trim() : ""
    if (text) setLocationAddress(text)
  }, [])

  const isPending = Boolean(isPendingProp ?? localMutation.isPending)
  const draftLat = Number(locationLat)
  const draftLng = Number(locationLng)
  const hasDraftCoords = Number.isFinite(draftLat) && Number.isFinite(draftLng)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const payload = {
          name,
          bio: bio || null,
          city_id: cityId || null,
          location_lat: hasDraftCoords ? draftLat : null,
          location_lng: hasDraftCoords ? draftLng : null,
          location_address: locationAddress.trim() || null,
        }

        if (onSubmit) {
          onSubmit(payload)
          return
        }
        localMutation.mutate(payload)
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
        <LocationCitySelect
          regions={regions}
          value={cityId}
          onChange={setCityId}
          initialRegionId={profile?.city?.region?.id}
          placeholder={t("profile.selectCity", "اختر المدينة")}
          showClearOption
          showLabels
        />
      </div>
      <div className="max-w-none space-y-4">
        <Label>{t("dashboard.profileMetrics.locationMapLabel")}</Label>
        <Input
          value={locationAddress}
          onChange={(e) => setLocationAddress(e.target.value)}
          className="mt-1"
          placeholder={t("dashboard.profileMetrics.locationAddressPlaceholder")}
        />
        <p className="text-[11px] text-muted-foreground">{t("profile.mapAutoFillHint")}</p>
        {mapActive ? (
          <EditableLocationMapField
            lat={hasDraftCoords ? draftLat : null}
            lng={hasDraftCoords ? draftLng : null}
            address={locationAddress}
            searchPlaceholder={t("dashboard.profileMetrics.locationAddressPlaceholder")}
            onChange={({ lat, lng, address: addr }) => {
              handleLocationChange({ lat, lng })
              if (addr != null) setLocationAddress(addr)
            }}
            onGeocodeResolved={handleGeocodeResolved}
            onPlaceResolved={handlePlaceResolved}
          />
        ) : (
          <div
            className="min-h-[45vh] w-full rounded-2xl border border-border bg-muted/30 sm:min-h-[280px]"
            aria-hidden
          />
        )}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.save")}
      </Button>
    </form>
  )
}
