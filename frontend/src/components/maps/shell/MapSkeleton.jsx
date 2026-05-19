import { cn } from "@/lib/utils"

export function MapSkeleton({ className = "min-h-[220px] w-full" }) {
  return (
    <div
      className={cn(
        "pointer-events-none relative overflow-hidden rounded-2xl bg-muted/50",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-background/40 before:to-transparent",
        className
      )}
      aria-hidden
    />
  )
}
