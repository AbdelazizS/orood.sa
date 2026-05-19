import { MapPin } from "lucide-react"
import { useTranslation } from "react-i18next"
import { googleMapsPlaceUrl, normalizeLatLng } from "@/lib/maps/urls"
import { Button } from "@/components/ui/button"

/**
 * Opens the same lat/lng as our map pin in Google Maps (coordinate search, not address guess).
 */
export function OpenInMapsButton({ lat, lng, label = "", variant = "outline", size = "sm", className = "" }) {
  const { t } = useTranslation()
  const { lat: nLat, lng: nLng } = normalizeLatLng(lat, lng)

  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return null

  const href = googleMapsPlaceUrl(nLat, nLng, label)

  return (
    <Button type="button" variant={variant} size={size} className={`gap-1.5 ${className}`} asChild>
      <a href={href} target="_blank" rel="noopener noreferrer" title={`${nLat}, ${nLng}`}>
        <MapPin className="size-3.5 shrink-0" aria-hidden />
        {t("maps.openInGoogleMaps", "فتح في Google Maps")}
      </a>
    </Button>
  )
}
