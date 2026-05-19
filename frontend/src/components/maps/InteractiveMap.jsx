import { useInView } from "react-intersection-observer"
import { LazyMapEmbed } from "./LazyMapEmbed.jsx"
import { cn } from "@/lib/utils"

/** Multi-marker interactive map (companies directory, logistics when wired). */
export function InteractiveMap({ markers, className = "", mapHeightClass = "min-h-[320px] h-[420px]", rootMargin = "80px" }) {
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin })
  const list = Array.isArray(markers) ? markers : []
  const valid = list.some((m) => m?.lat != null && m?.lng != null && Number.isFinite(m.lat) && Number.isFinite(m.lng))
  if (!valid) return null

  return (
    <div ref={ref} className={cn("overflow-hidden rounded-[inherit]", className)}>
      {inView ? (
        <LazyMapEmbed
          markers={list}
          interactive
          flyToPrimary={false}
          zoom={11}
          mapClassName={cn("w-full touch-manipulation", mapHeightClass)}
        />
      ) : (
        <div className={cn("w-full animate-pulse rounded-[inherit] bg-muted", mapHeightClass)} aria-hidden />
      )}
    </div>
  )
}
