import { lazy, Suspense } from "react"
import { useInView } from "react-intersection-observer"
import { cn } from "@/lib/utils"

const MapEmbed = lazy(() => import("./MapEmbed.jsx"))

function MapSkeleton({ className }) {
  return <div className={cn("animate-pulse bg-muted/40", className)} aria-hidden />
}

/**
 * Lazy MapEmbed — defers map SDK until near viewport (replaces LazyLeafletMapEmbed).
 */
export function LazyMapEmbed({ rootMargin = "160px", className = "", mapClassName, ...rest }) {
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin })

  const wrapperClass = className || mapClassName || "h-full w-full min-h-[220px]"

  return (
    <div ref={ref} className={wrapperClass}>
      {inView ? (
        <Suspense fallback={<MapSkeleton className={mapClassName || wrapperClass} />}>
          <MapEmbed mapClassName={mapClassName || wrapperClass} {...rest} />
        </Suspense>
      ) : (
        <MapSkeleton className={mapClassName || wrapperClass} />
      )}
    </div>
  )
}

/** @deprecated Use LazyMapEmbed */
export const LazyLeafletMapEmbed = LazyMapEmbed
