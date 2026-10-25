import { useState } from "react"
import { useTranslation } from "react-i18next"
import { LocateFixed, Loader2, Minus, Plus } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/**
 * Floating map controls (zoom in / out, my location). The engine passes its own handlers.
 * @param {{ onZoomIn: () => void, onZoomOut: () => void, onLocate: (pos: { lat: number, lng: number }) => void, className?: string }} props
 */
export function MapControls({ onZoomIn, onZoomOut, onLocate, className }) {
  const { t } = useTranslation()
  const [locating, setLocating] = useState(false)

  const locate = () => {
    if (!navigator.geolocation) {
      toast.error(t("listingsMap.locateUnsupported", "المتصفح لا يدعم تحديد الموقع"))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        onLocate({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        setLocating(false)
        toast.error(t("listingsMap.locateDenied", "تعذر تحديد موقعك — اسمح للمتصفح بالوصول للموقع"))
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  return (
    <div className={cn("pointer-events-auto flex flex-col gap-2", className)}>
      <div className="flex flex-col overflow-hidden rounded-xl shadow-md">
        <button type="button" className="map-ctrl-btn rounded-none border-b-0" onClick={onZoomIn} aria-label={t("listingsMap.zoomIn", "تكبير")}>
          <Plus className="size-5" aria-hidden />
        </button>
        <button type="button" className="map-ctrl-btn rounded-none" onClick={onZoomOut} aria-label={t("listingsMap.zoomOut", "تصغير")}>
          <Minus className="size-5" aria-hidden />
        </button>
      </div>
      <button type="button" className="map-ctrl-btn" onClick={locate} disabled={locating} aria-label={t("listingsMap.myLocation", "موقعي")}>
        {locating ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <LocateFixed className="size-5 text-primary" aria-hidden />}
      </button>
    </div>
  )
}
