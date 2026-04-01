import { useAppDirection } from "@/providers/DirectionProvider"
import { resolveImageUrl } from "@/lib/imageUrl"
import { Separator } from "@/components/ui/separator"

/**
 * Section 4 — Product Images.
 * Full width, stacked vertically. No padding, no border-radius, no shadow.
 * Count badge bottom-left on first image.
 */
export function ListingImages({ product }) {
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
          <span className="text-sm">{product?.title ? "صورة" : "صورة"}</span>
        </div>
        <Separator />
      </>
    )
  }

  return (
    <>
      <div dir={direction} className="flex w-full flex-col gap-1">
        {urls.map((url, i) => (
          <div key={i} className="relative w-full">
            <img
              src={url}
              alt={`صورة ${i + 1}`}
              className="w-full object-cover"
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
