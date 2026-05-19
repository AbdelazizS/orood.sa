import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { LocationMapPicker } from "@/components/maps/LocationMapPicker"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { MAP_PICKER_SHELL_CLASS, MAP_PICKER_VIEW_PROPS } from "@/lib/maps/mapPickerUi"
import { normalizeLatLng } from "@/lib/maps/urls"

export function ListingReLocationMap({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const [fullOpen, setFullOpen] = useState(false)
  const rawLat = product?.location_lat != null ? Number(product.location_lat) : null
  const rawLng = product?.location_lng != null ? Number(product.location_lng) : null
  const { lat, lng } = normalizeLatLng(rawLat, rawLng)

  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  const mapPicker = (className = "") => (
    <LocationMapPicker
      {...MAP_PICKER_VIEW_PROPS}
      lat={lat}
      lng={lng}
      className={cn(MAP_PICKER_SHELL_CLASS, "h-52 min-h-[12rem]", className)}
      onChange={() => {}}
    />
  )

  return (
    <section dir={direction} className="px-4 pb-4 pt-2">
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        {mapPicker()}
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute end-2 top-2 size-8 bg-background/90 shadow-sm"
          onClick={() => setFullOpen(true)}
          aria-label={t("maps.fullscreen", "ملء الشاشة")}
        >
          <Maximize2 className="size-4" />
        </Button>
      </div>

      <Dialog open={fullOpen} onOpenChange={setFullOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("maps.propertyLocationTitle", "موقع العقار")}</DialogTitle>
          </DialogHeader>
          {mapPicker("h-[60vh]")}
        </DialogContent>
      </Dialog>
    </section>
  )
}
