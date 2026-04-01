import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/imageUrl"
import { Expand, ChevronLeft, ChevronRight } from "lucide-react"

/**
 * ImageGallery — large main image, thumbnails, fullscreen preview.
 * Enterprise-grade image gallery.
 */
export function ImageGallery({ images = [], title, className }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  const rawUrls = Array.isArray(images) && images.length > 0 ? images : []
  const urls = rawUrls.map((u) => resolveImageUrl(u)).filter(Boolean)
  const mainUrl = urls[selectedIndex] ?? urls[0]

  const goPrev = (e) => {
    e?.stopPropagation()
    setSelectedIndex((i) => (i <= 0 ? urls.length - 1 : i - 1))
  }

  const goNext = (e) => {
    e?.stopPropagation()
    setSelectedIndex((i) => (i >= urls.length - 1 ? 0 : i + 1))
  }

  if (urls.length === 0) {
    return (
      <div
        className={cn(
          "flex aspect-video w-full items-center justify-center rounded-2xl bg-muted text-muted-foreground",
          className
        )}
      >
        <span className="text-sm">No image</span>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main image */}
      <div className="relative overflow-hidden rounded-2xl bg-muted">
        <button
          type="button"
          onClick={() => setFullscreenOpen(true)}
          className="group relative block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
        >
          <img
            src={mainUrl}
            alt={title}
            className="aspect-video w-full object-cover transition-transform group-hover:scale-[1.02]"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span className="absolute bottom-3 end-3 flex size-10 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Expand className="size-5" />
          </span>
        </button>
        {urls.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute start-2 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors [&>svg]:rtl:rotate-180"
              aria-label="Previous image"
            >
              <ChevronLeft className="size-6 rtl-rotate" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute end-2 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors [&>svg]:rtl:rotate-180"
              aria-label="Next image"
            >
              <ChevronRight className="size-6 rtl-rotate" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {urls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                selectedIndex === i
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen dialog */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto p-0 border-0 bg-black/95">
          <div className="relative flex items-center justify-center min-h-[70vh] p-4">
            <img
              src={mainUrl}
              alt={title}
              className="max-h-[85vh] max-w-full object-contain"
            />
            {urls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute start-2 top-1/2 -translate-y-1/2 flex size-12 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 rtl:rotate-180"
                >
                  <ChevronLeft className="size-8 rtl-rotate" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute end-2 top-1/2 -translate-y-1/2 flex size-12 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 rtl:rotate-180"
                >
                  <ChevronRight className="size-8 rtl-rotate" />
                </button>
              </>
            )}
          </div>
          <div className="flex justify-center gap-2 p-2 border-t border-white/10">
            {urls.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={cn(
                  "h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                  selectedIndex === i
                    ? "border-white"
                    : "border-white/30 opacity-60 hover:opacity-100"
                )}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
