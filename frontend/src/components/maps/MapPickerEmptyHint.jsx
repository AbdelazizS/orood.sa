import { useTranslation } from "react-i18next"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Shown over a live basemap when no pin is placed yet (tiles remain visible underneath).
 */
export function MapPickerEmptyHint({ className = "" }) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-3 bottom-3 z-[15] flex items-center gap-2 rounded-lg border border-border/60 bg-background/85 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-sm",
        className
      )}
      aria-hidden
    >
      <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
      <span>{t("maps.pickLocationOnMap", "انقر على الخريطة لتحديد موقعك")}</span>
    </div>
  )
}
