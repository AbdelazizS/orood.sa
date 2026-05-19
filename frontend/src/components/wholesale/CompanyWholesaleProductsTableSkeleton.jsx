import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

const ROWS = 8

export function CompanyWholesaleProductsTableSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <Skeleton className="h-7 w-56" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-9 flex-1 max-w-md" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-0 sm:p-6">
        <div className="rounded-md border overflow-hidden">
          <div className="flex gap-3 border-b bg-muted/30 px-4 py-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {Array.from({ length: ROWS }).map((_, row) => (
            <div key={row} className="flex items-center gap-3 border-b px-4 py-4 last:border-0">
              <Skeleton className="h-12 w-12 shrink-0 rounded-md" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/5 max-w-xs" />
                <Skeleton className="h-3 w-1/3 max-w-[8rem]" />
              </div>
              <Skeleton className="hidden h-4 w-16 sm:block" />
              <Skeleton className="hidden h-4 w-16 md:block" />
              <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
            </div>
          ))}
        </div>
        <div className="flex justify-between px-2 pb-2">
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
