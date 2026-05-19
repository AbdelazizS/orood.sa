import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LocationMapPicker } from "@/components/maps/LocationMapPicker"
import { OpenInMapsButton } from "./OpenInMapsButton.jsx"
import { Maximize2, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  MAP_PICKER_SHELL_CLASS_LARGE,
  MAP_PICKER_VIEW_PROPS,
} from "@/lib/maps/mapPickerUi"
import { normalizeLatLng } from "@/lib/maps/urls"

export function PropertyLocationMap({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const [fullOpen, setFullOpen] = useState(false)
  const rawLat = product?.location_lat != null ? Number(product.location_lat) : null
  const rawLng = product?.location_lng != null ? Number(product.location_lng) : null
  const { lat, lng } = normalizeLatLng(rawLat, rawLng)

  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const addressLabel =
    (typeof product?.location_address === "string" && product.location_address.trim()) ||
    product?.location_city ||
    product?.city?.name ||
    ""
  const mapLabel = addressLabel || product?.title || ""

  const mapPicker = (extraClass = "") => (
    <LocationMapPicker
      {...MAP_PICKER_VIEW_PROPS}
      lat={lat}
      lng={lng}
      className={cn(MAP_PICKER_SHELL_CLASS_LARGE, extraClass)}
      onChange={() => {}}
    />
  )

  return (
    <section dir={direction} className="border-b border-border px-4 py-4 sm:px-6">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-start">
          <h3 className="text-base font-semibold text-foreground">
            {t("maps.propertyLocationTitle", "موقع العقار")}
          </h3>
          {addressLabel ? (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>{addressLabel}</span>
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5"
          onClick={() => setFullOpen(true)}
        >
          <Maximize2 className="size-3.5" aria-hidden />
          {t("maps.fullscreen", "ملء الشاشة")}
        </Button>
      </div>

      {mapPicker()}

      <div className="mt-3 flex flex-wrap gap-2">
        <OpenInMapsButton lat={lat} lng={lng} label={mapLabel} />
      </div>

      <Dialog open={fullOpen} onOpenChange={setFullOpen}>
        <DialogContent
          showCloseButton
          className={cn(
            "flex h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] translate-x-[-50%] translate-y-[-50%]",
            "flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-2xl sm:max-w-[100vw]"
          )}
        >
          <DialogHeader className="shrink-0 space-y-1 border-b border-border px-4 py-3 text-start sm:px-6">
            <DialogTitle>{t("maps.propertyLocationTitle", "موقع العقار")}</DialogTitle>
            {addressLabel ? (
              <p className="flex items-start gap-1.5 text-sm font-normal text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>{addressLabel}</span>
              </p>
            ) : null}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
            {mapPicker("[&_.relative]:!min-h-[min(72vh,720px)]")}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 border-t border-border px-4 py-3 sm:px-6">
            <OpenInMapsButton lat={lat} lng={lng} label={mapLabel} />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
