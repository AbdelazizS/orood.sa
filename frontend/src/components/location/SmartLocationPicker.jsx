import { useState } from "react"
import { useTranslation } from "react-i18next"
import { MapPin } from "lucide-react"
import { UserLocationPicker } from "@/components/maps/UserLocationPicker"
import { LocationSelectedBar } from "@/components/location/LocationSelectedBar"
import { CompactMarketplaceMap } from "@/components/location/CompactMarketplaceMap"
import { Button } from "@/components/ui/button"
import { MAP_PICKER_EDIT_PROPS } from "@/lib/maps/mapPickerUi"
import { cn } from "@/lib/utils"

/** Marketplace location picker — placeholder when empty, compact map + bottom address bar when active. */
export function SmartLocationPicker({
  lat,
  lng,
  address = "",
  onChange,
  error,
  label,
  required = false,
  className,
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(() => lat != null && lng != null)
  const hasCoords = lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
  const resolving = hasCoords && !address?.trim()

  if (!expanded && !hasCoords) {
    return (
      <div className={cn("mb-4", className)}>
        {label ? (
          <p className="mb-2 text-sm font-semibold text-foreground">
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
        >
          <MapPin className="size-8 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium text-foreground">
            {t("location.setLocationCta", "حدد الموقع")}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("location.setLocationHint", "اضغط لتحديد الموقع على الخريطة")}
          </span>
        </button>
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className={cn("mb-4 space-y-2", className)}>
      {label ? (
        <p className="text-sm font-semibold text-foreground">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </p>
      ) : null}
      <CompactMarketplaceMap
        footer={
          hasCoords && (resolving || address?.trim()) ? (
            <LocationSelectedBar address={address} loading={resolving} />
          ) : null
        }
      >
        <UserLocationPicker
          lat={lat}
          lng={lng}
          searchValue={address}
          onReverseGeocode={(placeName, coords) =>
            onChange?.({
              lat: coords?.lat ?? lat,
              lng: coords?.lng ?? lng,
              address: placeName?.trim() || address,
            })
          }
          onChange={({ lat: newLat, lng: newLng, address: nextAddress }) =>
            onChange?.({
              lat: newLat,
              lng: newLng,
              ...(nextAddress !== undefined ? { address: nextAddress } : {}),
            })
          }
          {...MAP_PICKER_EDIT_PROPS}
          hintInFooter={!hasCoords}
          showInlineHint={!hasCoords}
        />
      </CompactMarketplaceMap>
      {!hasCoords && expanded ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)}>
          {t("common.cancel", "إلغاء")}
        </Button>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
