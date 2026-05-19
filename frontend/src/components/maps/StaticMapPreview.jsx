import { useInView } from "react-intersection-observer"
import { useTranslation } from "react-i18next"
import { LazyMapEmbed } from "./LazyMapEmbed.jsx"
import { cn } from "@/lib/utils"

/** Below-the-fold friendly preview: loads Leaflet once the container nears the viewport. */
export function StaticMapPreview({ lat, lng, label, className = "", rootMargin = "160px" }) {
  const { t } = useTranslation()
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin })

  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const markers = [{ id: "preview", lat, lng, label }]

  return (
    <div ref={ref} className={cn("relative isolate overflow-hidden rounded-[inherit]", className)}>
      {inView ? (
        <LazyMapEmbed
          preview
          markers={markers}
          interactive={false}
          flyToPrimary
          showPopups={false}
          zoom={14}
          mapClassName="h-full min-h-[220px] w-full touch-manipulation"
        />
      ) : (
        <div
          className="flex h-full min-h-[220px] w-full items-center justify-center bg-muted/60 text-xs text-muted-foreground"
          aria-hidden
        >
          {t("maps.previewLoading", "Loading map…")}
        </div>
      )}
    </div>
  )
}
