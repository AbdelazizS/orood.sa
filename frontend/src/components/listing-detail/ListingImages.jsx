import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { resolveImageUrl } from "@/lib/imageUrl"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const IMAGE_MIN_H = "min-h-[360px] sm:min-h-[420px] lg:min-h-[520px]"

/**
 * Product images — Haraj-style full-width vertical stack below description.
 */
export function ListingImages({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const images =
    product?.media?.gallery ??
    (product?.media?.image_url ? [product.media.image_url] : [])
  const urls = Array.isArray(images)
    ? images.map((u) => resolveImageUrl(u)).filter(Boolean)
    : []

  if (urls.length === 0) {
    return (
      <>
        <div
          dir={direction}
          className={cn(
            "relative -mx-4 flex aspect-video w-[calc(100%+2rem)] items-center justify-center bg-muted/30 text-muted-foreground sm:mx-0 sm:w-full",
            IMAGE_MIN_H
          )}
        >
          <span className="text-base">{t("listingDetail.imageLabel", "Image")}</span>
        </div>
        <Separator />
      </>
    )
  }

  return (
    <>
      <div dir={direction} className="relative -mx-4 flex w-[calc(100%+2rem)] flex-col gap-0 sm:mx-0 sm:w-full">
        {urls.map((url, i) => (
          <div
            key={i}
            className={cn("relative w-full overflow-hidden bg-muted/30", IMAGE_MIN_H)}
          >
            <img
              src={url}
              alt={t("listingDetail.imageNumber", { index: i + 1, defaultValue: "Image {{index}}" })}
              className="h-full w-full object-cover object-center"
              style={{ display: "block" }}
              onError={(e) => {
                e.target.style.display = "none"
              }}
            />
          </div>
        ))}
      </div>
      <Separator />
    </>
  )
}
