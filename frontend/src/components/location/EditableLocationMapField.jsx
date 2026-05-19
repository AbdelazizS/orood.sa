import { useTranslation } from "react-i18next"
import { UserLocationPicker } from "@/components/maps/UserLocationPicker"
import { CompactMarketplaceMap } from "@/components/location/CompactMarketplaceMap"
import { LocationSelectedBar } from "@/components/location/LocationSelectedBar"
import { MAP_PICKER_EDIT_PROPS } from "@/lib/maps/mapPickerUi"
import { cn } from "@/lib/utils"

/**
 * Editable map + marketplace bottom address bar (profile, forms, legacy pickers).
 */
export function EditableLocationMapField({
  lat,
  lng,
  address = "",
  onChange,
  label,
  className,
  pickerClassName,
  language,
  searchPlaceholder,
  ...pickerProps
}) {
  const { t } = useTranslation()
  const hasCoords = lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
  const resolving = hasCoords && !address?.trim()

  const handleReverseGeocode = (placeName, coords) => {
    onChange?.({
      lat: coords?.lat ?? lat,
      lng: coords?.lng ?? lng,
      address: placeName?.trim() || address,
    })
  }

  const handleCoordsChange = ({ lat: newLat, lng: newLng }) => {
    onChange?.({ lat: newLat, lng: newLng, address })
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <p className="text-sm font-semibold text-foreground">{label}</p> : null}
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
          language={language}
          searchValue={address}
          searchPlaceholder={searchPlaceholder}
          onReverseGeocode={handleReverseGeocode}
          onChange={handleCoordsChange}
          {...MAP_PICKER_EDIT_PROPS}
          hintInFooter={!hasCoords}
          showInlineHint={!hasCoords}
          {...pickerProps}
          className={pickerClassName}
        />
      </CompactMarketplaceMap>
      {!hasCoords ? (
        <p className="text-xs text-muted-foreground">
          {t("purchase.mapHint", "انقر على الخريطة أو اسحب الدبوس لتحديد الموقع")}
        </p>
      ) : null}
    </div>
  )
}
