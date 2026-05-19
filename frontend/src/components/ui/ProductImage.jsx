import { useState } from "react"
import { Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/imageUrl"
import { getProductImageFallback } from "@/lib/productImageFallback"

export function ProductImage({
  src,
  alt = "",
  categorySlug,
  className,
  iconClassName,
  showIconFallback = true,
  ...props
}) {
  const fallback = getProductImageFallback(categorySlug)
  const [useFallback, setUseFallback] = useState(!src)
  const displaySrc = useFallback || !src ? fallback : resolveImageUrl(src)

  if (!src && showIconFallback) {
    return (
      <div
        className={cn(
          "flex size-full items-center justify-center bg-muted text-muted-foreground",
          className
        )}
        role="img"
        aria-label={alt}
      >
        <Package className={cn("size-10 opacity-40", iconClassName)} aria-hidden />
      </div>
    )
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setUseFallback(true)}
      {...props}
    />
  )
}
