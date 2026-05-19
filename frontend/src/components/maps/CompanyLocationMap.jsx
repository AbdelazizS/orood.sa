import { useTranslation } from "react-i18next"
import { LocationMapPreview } from "@/components/maps/LocationMapPreview.jsx"

export function CompanyLocationMap({
  company,
  dir = "rtl",
  viewOnMapHref,
  className = "",
  mapHeightClass,
}) {
  const { t } = useTranslation()
  const lat = company?.lat != null ? Number(company.lat) : null
  const lng = company?.lng != null ? Number(company.lng) : null
  const cityLine = [company?.city, company?.region].filter(Boolean).join(" — ")
  const mapBrowseUrl =
    viewOnMapHref ?? (company?.city ? `/map?city=${encodeURIComponent(company.city)}` : "/map")

  return (
    <LocationMapPreview
      lat={lat}
      lng={lng}
      title={t("maps.companyHqTitle", "Company location")}
      subtitle={cityLine}
      label={company?.name ?? company?.location_city ?? ""}
      dir={dir}
      viewOnMapHref={mapBrowseUrl}
      viewOnMapLabel={t("maps.viewOnMap", "View on map")}
      markerId={company?.id ?? "hq"}
      className={className}
      mapHeightClass={mapHeightClass}
    />
  )
}
