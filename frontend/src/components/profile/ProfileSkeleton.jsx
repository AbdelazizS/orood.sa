import { Skeleton } from "@/components/ui/skeleton"

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-6xl space-y-4 p-4 pb-20">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="-mt-12 flex items-end justify-between px-2">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-6 w-52" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
