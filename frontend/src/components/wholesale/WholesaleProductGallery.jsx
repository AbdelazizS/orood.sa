import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useReducedMotion } from "framer-motion"
import { ZoomIn } from "lucide-react"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/imageUrl"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

/**
 * Wholesale PDP gallery — main + thumbnail rail + lightbox (retail ListingImages unchanged).
 */
export function WholesaleProductGallery({ product, dir = "rtl", className }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const urls = useMemo(() => {
    const gallery = product?.media?.gallery
    const raw = Array.isArray(gallery)
      ? gallery
      : product?.media?.image_url
        ? [product.media.image_url]
        : []
    return raw.map((u) => resolveImageUrl(u)).filter(Boolean)
  }, [product?.media])

  const [index, setIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    setIndex(0)
  }, [product?.id])

  const safeIndex = Math.min(Math.max(0, index), Math.max(0, urls.length - 1))
  const current = urls[safeIndex] ?? null

  const onKeyNav = useCallback(
    (e) => {
      if (!urls.length) return
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const delta = e.key === "ArrowRight" ? 1 : -1
        const next = (safeIndex + delta + urls.length) % urls.length
        setIndex(next)
      }
      if (e.key === "Escape") setLightboxOpen(false)
    },
    [urls.length, safeIndex]
  )

  useEffect(() => {
    if (!lightboxOpen) return
    window.addEventListener("keydown", onKeyNav)
    return () => window.removeEventListener("keydown", onKeyNav)
  }, [lightboxOpen, onKeyNav])

  if (!current) {
    return (
      <div
        dir={dir}
        className={cn(
          "flex aspect-[4/3] w-full items-center justify-center bg-muted text-muted-foreground",
          className
        )}
      >
        <span className="text-sm">{t("listingDetail.imageLabel", "Image")}</span>
      </div>
    )
  }

  return (
    <div dir={dir} className={cn("min-w-0", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
        {urls.length > 1 ? (
          <div
            className="scrollbar-hide flex flex-row gap-2 overflow-x-auto pb-1 lg:w-[4.5rem] lg:flex-shrink-0 lg:flex-col lg:overflow-y-auto lg:pb-0 lg:pe-0"
            style={{ maxHeight: "min(70vh, 520px)" }}
            role="tablist"
            aria-label={t("wholesale.pdp.galleryThumbnails")}
          >
            {urls.map((url, i) => (
              <button
                key={url + i}
                type="button"
                role="tab"
                aria-selected={i === safeIndex}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-xl border-2 transition-[border-color,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:size-[4.5rem]",
                  i === safeIndex ? "border-primary opacity-100" : "border-transparent opacity-75 hover:opacity-100"
                )}
                onClick={() => setIndex(i)}
              >
                <img src={url} alt="" className="size-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="relative min-h-[220px] flex-1 overflow-hidden rounded-2xl bg-muted sm:min-h-[280px] lg:min-h-[360px]">
          <button
            type="button"
            className="group relative block size-full min-h-[inherit] w-full text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setLightboxOpen(true)}
            aria-label={t("wholesale.pdp.openGalleryLightbox")}
          >
            <img
              key={current}
              src={current}
              alt={t("listingDetail.imageNumber", { index: safeIndex + 1, defaultValue: "Image {{index}}" })}
              className={cn(
                "h-full w-full max-h-[65vh] object-cover lg:max-h-[min(70vh,640px)]",
                !reduceMotion && "transition-opacity duration-200"
              )}
              style={{ display: "block" }}
            />
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="pointer-events-none absolute bottom-3 end-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
              <ZoomIn className="size-3.5 opacity-80" aria-hidden />
              {urls.length > 1 ? t("wholesale.pdp.galleryCounter", { current: safeIndex + 1, total: urls.length }) : null}
            </span>
          </button>
        </div>
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-h-[95vh] max-w-[min(100vw,1200px)] border-0 bg-black/95 p-2 sm:p-4" showCloseButton>
          <DialogTitle className="sr-only">{product?.title ?? t("wholesale.pdp.lightboxTitle")}</DialogTitle>
          <div className="flex max-h-[85vh] items-center justify-center">
            <img
              src={current}
              alt=""
              className="max-h-[85vh] w-auto max-w-full object-contain"
            />
          </div>
          {urls.length > 1 ? (
            <div className="flex justify-center gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIndex((safeIndex - 1 + urls.length) % urls.length)}>
                {t("wholesale.pdp.galleryPrev")}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setIndex((safeIndex + 1) % urls.length)}>
                {t("wholesale.pdp.galleryNext")}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
