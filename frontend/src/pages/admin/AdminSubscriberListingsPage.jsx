import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { adminListSubscriberListings } from "@/services/subscriberService"
import { usePermission } from "@/hooks/usePermission"
import { SubscriberFilters } from "@/components/subscriber/SubscriberFilters"
import { AdStatusBadge, NotesMeta, SubscriberListingCard } from "@/components/subscriber/SubscriberListingCard"
import { AdminListingAdActions } from "@/components/subscriber/AdminListingAdActions"
import { FollowUpNotesThread } from "@/components/subscriber/FollowUpNotesThread"
import { EMPTY_SUBSCRIBER_FILTERS, formatFullPrice, subscriberFilterParams } from "@/lib/subscriber/subscriberFormat"
import { timeAgo } from "@/lib/timeAgo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ExternalLink, Loader2, UserRound } from "lucide-react"

/**
 * Admin "عروض المشتركين": every bought listing (newest note first) with its private follow-up thread.
 */
export function AdminSubscriberListingsPage() {
  const { t } = useTranslation()
  const canView = usePermission("subscribers.notes")
  const [searchParams] = useSearchParams()
  const subscriberId = searchParams.get("subscriber_id")
  const [filters, setFilters] = useState(EMPTY_SUBSCRIBER_FILTERS)
  const [openRow, setOpenRow] = useState(null)
  const [status, setStatus] = useState("")
  const params = { ...subscriberFilterParams(filters), subscriber_id: subscriberId, status: status || undefined }

  const query = useInfiniteQuery({
    queryKey: ["admin", "subscriber-listings", params],
    queryFn: ({ pageParam }) => adminListSubscriberListings({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta?.current_page < last.meta?.last_page ? last.meta.current_page + 1 : undefined,
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
    enabled: canView,
  })

  const rows = useMemo(() => (query.data?.pages ?? []).flatMap((p) => p.items), [query.data])

  if (!canView) {
    return <p className="p-6 text-sm text-muted-foreground">{t("adminSubscribers.forbidden", "ليس لديك صلاحية")}</p>
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("adminSubscribers.listingsTitle", "عروض المشتركين")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("adminSubscribers.listingsHint", "العقارات التي اشترى المشتركون إعلاناتها. اكتب متابعة تحت أي عقار (مثلاً: اتصل عميل وطلب العقار) وستظهر للمشترك والإدارة فقط.")}
          </p>
          {subscriberId ? (
            <Button variant="link" className="h-auto self-start p-0" asChild>
              <Link to="/admin/subscriber-listings">{t("adminSubscribers.showAll", "عرض كل المشتركين")}</Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <SubscriberFilters value={filters} onChange={setFilters} />
          <div className="flex flex-wrap gap-1.5">
            {["", "active", "sold", "expired", "cancelled"].map((st) => (
              <Button key={st || "all"} size="sm" variant={status === st ? "default" : "outline"} onClick={() => setStatus(st)}>
                {st ? t(`subscriber.ad.${st}`, st) : t("subscriber.ad.all", "الكل")}
              </Button>
            ))}
          </div>

          {query.isLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("adminSubscribers.listingsEmpty", "لا توجد عقارات مشتراة بعد")}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {rows.map((row) => (
                <SubscriberListingCard
                    key={row.id}
                    product={row.product}
                    onOpen={() => setOpenRow(row)}
                    unreadCount={row.unread_count}
                    footer={
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <UserRound className="size-3.5" aria-hidden />
                          {row.subscriber?.name}
                          <AdStatusBadge status={row.status} daysLeft={row.days_left} />
                        </span>
                        <NotesMeta notesCount={row.notes_count} lastNoteAt={row.last_note_at} unreadCount={row.unread_count} />
                      </div>
                    }
                  />
              ))}
            </div>
          )}

          {query.hasNextPage ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                {query.isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : t("subscriber.loadMore", "عرض المزيد")}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Sheet open={Boolean(openRow)} onOpenChange={(open) => !open && setOpenRow(null)}>
        <SheetContent side="start" className="w-full max-w-none gap-0 overflow-y-auto sm:w-[460px] sm:max-w-[460px]">
          {openRow ? (
            <>
              <SheetHeader className="border-b border-border">
                <SheetTitle className="pe-6">{openRow.product?.title}</SheetTitle>
                <SheetDescription>
                  {formatFullPrice(openRow.product?.price, t) ?? "—"} · {openRow.subscriber?.name} ·{" "}
                  {t("adminSubscribers.purchased", "اشترى الإعلان")} {timeAgo(openRow.purchased_at, t)}
                </SheetDescription>
                <Button variant="outline" size="sm" className="mt-2 gap-1.5 self-start" asChild>
                  <Link to={`/products/${openRow.product?.id}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" aria-hidden />
                    {t("adminSubscribers.openListing", "فتح الإعلان")}
                  </Link>
                </Button>
              </SheetHeader>
              <div className="space-y-4 p-4">
                <AdminListingAdActions row={openRow} onDone={(next) => setOpenRow({ ...openRow, ...next })} />
                <FollowUpNotesThread subscriberListingId={openRow.id} />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
