import { useTranslation } from "react-i18next"
import { LocationSelector } from "@/components/add-listing/LocationSelector"
import { SmartLocationPicker } from "@/components/location/SmartLocationPicker"

/**
 * Schema-driven location block.
 * @param {{ mode?: string, required?: boolean }} locationPolicy
 */
export function DynamicLocationField({
  locationPolicy,
  /** Pin map only for real-estate listings (ignores optional/exact_map on other categories). */
  mapEnabled = false,
  regionId,
  cityId,
  onRegionCityChange,
  lat,
  lng,
  address,
  onMapChange,
  regionCityError,
  mapError,
}) {
  const { t } = useTranslation()
  const mode = locationPolicy?.mode ?? "region_only"
  const required = Boolean(locationPolicy?.required)

  if (mode === "hidden") return null

  const showRegionCity = mode === "region_only" || mode === "city_only" || mode === "exact_map" || mode === "optional"
  const showMap = mapEnabled && mode === "exact_map"

  return (
    <>
      {showRegionCity ? (
        <LocationSelector
          regionId={regionId}
          cityId={cityId}
          error={regionCityError}
          onChange={onRegionCityChange}
        />
      ) : null}
      {showMap ? (
        <SmartLocationPicker
          lat={lat}
          lng={lng}
          address={address}
          required={required && mode === "exact_map"}
          label={t("addListing.propertyLocation", "موقع العقار")}
          error={mapError}
          onChange={onMapChange}
        />
      ) : null}
    </>
  )
}
