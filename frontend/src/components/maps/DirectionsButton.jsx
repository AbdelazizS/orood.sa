import { Navigation } from "lucide-react"
import { useTranslation } from "react-i18next"
import { googleDirectionsUrl, appleDirectionsUrl } from "@/lib/maps/urls"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DirectionsButton({ lat, lng, variant = "outline", size = "sm", className = "" }) {
  const { t } = useTranslation()
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const g = googleDirectionsUrl(lat, lng)
  const a = appleDirectionsUrl(lat, lng)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={variant} size={size} className={`gap-1.5 ${className}`}>
          <Navigation className="size-3.5 shrink-0" aria-hidden />
          {t("maps.directions", "Directions")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[12rem]">
        <DropdownMenuItem asChild>
          <a href={g} target="_blank" rel="noopener noreferrer">
            Google Maps
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={a} target="_blank" rel="noopener noreferrer">
            Apple Maps
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
