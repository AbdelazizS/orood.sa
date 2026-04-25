import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { resolveImageUrl } from "@/lib/imageUrl"
import { Separator } from "@/components/ui/separator"

/**
 * Section 4 — Product Images.
 * Full width, stacked vertically. No padding, no border-radius, no shadow.
 * Count badge bottom-left on first image.
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
          className="flex aspect-video w-full items-center justify-center bg-muted text-muted-foreground"
        >
          <span className="text-sm">{t("listingDetail.imageLabel", "Image")}</span>
        </div>
        <Separator />
      </>
    )
  }

  return (
    <>
      <div dir={direction} className="flex w-full flex-col gap-1">
        {urls.map((url, i) => (
          <div
            key={i}
            className={`relative w-full overflow-hidden bg-muted ${i === 0 ? "min-h-[260px] max-h-[65vh] sm:min-h-[320px] sm:max-h-[60vh] lg:min-h-[420px]" : "min-h-[180px] sm:min-h-[220px]"}`}
          >
            <img
              src={url}
              alt={t("listingDetail.imageNumber", { index: i + 1, defaultValue: "Image {{index}}" })}
              className={`h-full w-full object-cover ${i === 0 ? "max-h-[65vh] sm:max-h-[60vh]" : ""}`}
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
