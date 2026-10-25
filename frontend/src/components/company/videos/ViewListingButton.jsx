import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { viewListingLabel } from "@/lib/video/videoFormat"

/**
 * The only thing shown over a video about a listing (client note: no property photo, just the link),
 * so the video stays clear.
 */
export function ViewListingButton({ product, className }) {
  const { t } = useTranslation()
  if (!product) return null
  return (
    <Link
      to={`/products/${product.id}`}
      className={cn(
        "pointer-events-auto inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-5 text-sm font-bold text-neutral-900 shadow-lg transition-transform active:scale-95",
        className,
      )}
    >
      {viewListingLabel(product, t)}
      <ChevronLeft className="size-4 ltr:rotate-180" aria-hidden />
    </Link>
  )
}
