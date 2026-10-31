import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Volume2, VolumeX, X } from "lucide-react"
import { ViewListingButton } from "@/components/company/videos/ViewListingButton"
import { formatShortPrice } from "@/lib/formatShortPrice"
import { isAwaitingMarker } from "@/components/maps/PriceMarker"

/**
 * Plays a listing's video over the map (tap on a video bubble), TikTok-style:
 * full screen on phones, a tall card on desktop, with «عرض العقار / عرض التفاصيل».
 */
export function MapVideoOverlay({ marker, onClose }) {
  const { t, i18n } = useTranslation()
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(false)
  const video = marker?.video

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    // The tap that opened the overlay allows sound; fall back to muted if the browser refuses.
    el.play().catch(() => {
      el.muted = true
      setMuted(true)
      el.play().catch(() => {})
    })
  }, [video?.url])

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  if (!video?.url) return null

  const awaiting = isAwaitingMarker(marker)
  const price = formatShortPrice(marker.price, i18n.language)
  const perMeter = marker.price_per_meter ? formatShortPrice(marker.price_per_meter, i18n.language) : null
  const product = { id: marker.id, category: marker.category }
  const place = [marker.city, marker.district].filter(Boolean).join(" · ")

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 sm:p-6" role="dialog" aria-modal="true" aria-label={marker.title}>
      <div className="relative h-full w-full overflow-hidden bg-black sm:h-[92dvh] sm:w-[min(94vw,1100px)] sm:rounded-2xl">
        <video
          ref={videoRef}
          src={video.url}
          poster={video.thumbnail_url ?? undefined}
          className="size-full object-contain"
          playsInline
          loop
          muted={muted}
          onClick={(e) => (e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause())}
        />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full bg-black/50 text-white"
            aria-label={t("common.close", "إغلاق")}
          >
            <X className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="flex size-10 items-center justify-center rounded-full bg-black/50 text-white"
            aria-label={muted ? t("companyChannel.unmute", "تشغيل الصوت") : t("companyChannel.mute", "كتم الصوت")}
          >
            {muted ? <VolumeX className="size-5" aria-hidden /> : <Volume2 className="size-5" aria-hidden />}
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{marker.title}</p>
          <p className="text-sm">
            {awaiting && !price ? (
              <span className="font-semibold text-white/80">{t("listingsMap.awaitingPin", "انتظار")}</span>
            ) : price ? (
              <span className="font-bold">{price} {t("common.currency", "ريال")}</span>
            ) : null}
            {perMeter ? (
              <span className="ms-2 text-white/80">
                {t("listingsMap.perMeter", { value: perMeter, defaultValue: "{{value}} ريال/م²" })}
              </span>
            ) : null}
          </p>
          {place ? <p className="text-xs text-white/75">{place}</p> : null}
          <ViewListingButton product={product} />
        </div>
      </div>
    </div>
  )
}
