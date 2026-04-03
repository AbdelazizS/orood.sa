import { useAppDirection } from "@/providers/DirectionProvider"
import { Separator } from "@/components/ui/separator"

/**
 * Section 3 — Listing Title.
 * px-4 py-3. text-base font-bold. Direction-aware alignment.
 */
export function ListingTitle({ product }) {
  const { direction } = useAppDirection()
  const title = product?.title ?? ""
  if (!title) return null

  return (
    <>
      <div dir={direction} className="px-4 py-4 sm:px-6">
        <h1 className="text-lg font-bold leading-relaxed text-start text-foreground sm:text-xl">
          {title}
        </h1>
      </div>
      <Separator />
    </>
  )
}
