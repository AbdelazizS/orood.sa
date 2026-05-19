import { SmartLocationPicker } from "@/components/location/SmartLocationPicker"

/**
 * Unified editable location field — marketplace SmartLocationPicker wrapper.
 */
export function StandardLocationMapField({
  lat,
  lng,
  address = "",
  onChange,
  onAddressResolved,
  onPlaceResolved,
  searchPlaceholder,
  className = "",
  language,
}) {
  return (
    <SmartLocationPicker
      className={className}
      lat={lat}
      lng={lng}
      address={address}
      label={searchPlaceholder}
      onChange={({ lat: newLat, lng: newLng, address: newAddr }) => {
        onChange?.({ lat: newLat, lng: newLng })
        if (newAddr) onAddressResolved?.(newAddr)
        if (onPlaceResolved && newLat != null && newLng != null) {
          onPlaceResolved(newAddr ?? address, newLat, newLng)
        }
      }}
    />
  )
}
