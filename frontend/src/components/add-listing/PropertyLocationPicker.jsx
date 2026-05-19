import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { SmartLocationPicker } from "@/components/location/SmartLocationPicker"

/** Real-estate listing pin picker — uses marketplace SmartLocationPicker. */
export function PropertyLocationPicker({
  lat,
  lng,
  address: addressProp,
  onChange,
  error,
  className = "",
}) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()

  return (
    <div dir={direction} className={className}>
      <SmartLocationPicker
        lat={lat}
        lng={lng}
        address={addressProp ?? ""}
        required
        error={error}
        label={t("addListing.propertyLocationLabel", "موقع العقار على الخريطة")}
        onChange={onChange}
      />
    </div>
  )
}
