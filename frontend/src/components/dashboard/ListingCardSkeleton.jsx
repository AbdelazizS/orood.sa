import { Skeleton } from "@/components/ui/skeleton"

export function ListingCardSkeleton() {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <div className="flex gap-3 p-3">
        <Skeleton className="h-20 w-24 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2 text-start">
          <div className="flex gap-2 justify-start">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-3 w-24" />
          <div className="flex gap-3 justify-start">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
      </div>
      <div className="flex gap-2 px-3 py-2 border-t border-border">
        <Skeleton className="h-7 flex-1" />
        <Skeleton className="h-7 flex-1" />
        <Skeleton className="h-7 flex-1" />
        <Skeleton className="h-7 w-7" />
      </div>
    </div>
  )
}
