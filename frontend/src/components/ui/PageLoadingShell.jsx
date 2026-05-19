import { Skeleton } from "@/components/ui/skeleton"
import { PAGE_CONTAINER_CLASS } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

/**
 * Enterprise-style page skeleton (not full-screen app preloader).
 */
export function PageLoadingShell({ variant = "default", className }) {
  if (variant === "contact") {
    return (
      <div className={cn(PAGE_CONTAINER_CLASS, "space-y-10 py-8 md:py-12", className)} aria-busy="true">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-[420px] rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn(PAGE_CONTAINER_CLASS, "space-y-6 py-8 md:py-10", className)} aria-busy="true">
      <Skeleton className="h-28 w-full max-w-xl rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}
