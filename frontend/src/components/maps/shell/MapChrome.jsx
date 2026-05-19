import { Maximize2, Minus, Navigation, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

export function MapChrome({
  onLocate,
  onZoomIn,
  onZoomOut,
  onFullscreen,
  className = "",
  showLocate = true,
  showZoom = true,
  showFullscreen = false,
}) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        "pointer-events-none absolute end-3 top-3 z-10 flex flex-col gap-1.5",
        className
      )}
    >
      {showLocate && onLocate ? (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="pointer-events-auto size-9 bg-background/85 shadow-md backdrop-blur-md"
          onClick={onLocate}
          aria-label={t("maps.locateMe", "My location")}
        >
          <Navigation className="size-4" />
        </Button>
      ) : null}
      {showZoom ? (
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-lg border border-border/60 bg-background/85 shadow-md backdrop-blur-md">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9 rounded-none"
            onClick={onZoomIn}
            aria-label={t("mapsTest.zoomIn", "Zoom in")}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9 rounded-none border-t border-border/60"
            onClick={onZoomOut}
            aria-label={t("mapsTest.zoomOut", "Zoom out")}
          >
            <Minus className="size-4" />
          </Button>
        </div>
      ) : null}
      {showFullscreen && onFullscreen ? (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="pointer-events-auto size-9 bg-background/85 shadow-md backdrop-blur-md"
          onClick={onFullscreen}
          aria-label={t("maps.fullscreen", "Fullscreen")}
        >
          <Maximize2 className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}
