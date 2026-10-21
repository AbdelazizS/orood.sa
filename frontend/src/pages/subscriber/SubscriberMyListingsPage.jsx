import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getMySubscriberListings } from "@/services/subscriberService"
import { SubscriberFilters } from "@/components/subscriber/SubscriberFilters"
import { SubscriberPageHeader } from "@/components/subscriber/SubscriberPageHeader"
import { AdStatusBadge, NotesMeta, SubscriberListingCard } from "@/components/subscriber/SubscriberListingCard"
import { ListingsPriceMap } from "@/components/maps/ListingsPriceMap.jsx"
import { EMPTY_SUBSCRIBER_FILTERS, subscriberFilterParams } from "@/lib/subscriber/subscriberFormat"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { List, Loader2, Map as MapIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * "عروضي": listings whose ad this subscriber bought. Newest follow-up note first.
 */
export function SubscriberMyListingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filters, setFilters] = useState(EMPTY_SUBSCRIBER_FILTERS)
  const [view, setView] = useState("list")
  const [status, setStatus] = useState("")
  const params = { ...subscriberFilterParams(filters), status: status || undefined }

  const query = useInfiniteQuery({
    queryKey: ["subscriber", "my-listings", params],
    queryFn: ({ pageParam }) => getMySubscriberListings({ ...params, page: pageParam, per_page: 50 }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta?.current_page < last.meta?.last_page ? last.meta.current_page + 1 : undefined,
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  })

  const rows = useMemo(() => (query.data?.pages ?? []).flatMap((p) => p.items), [query.data])
  const markers = useMemo(
    () =>
      rows
        .map((r) => r.product)
        .filter((p) => p && Number.isFinite(Number(p.location_lat)) && Number.isFinite(Number(p.location_lng)))
        .map((p) => ({
          id: p.id,
          title: p.title,
          price: p.price,
          lat: Number(p.location_lat),
          lng: Number(p.location_lng),
          marketing_status: p.marketing_status,
        })),
    [rows],
  )

  return (
    <div className="space-y-4">
      <SubscriberPageHeader
        title={t("subscriber.tabs.mine", "عروضي")}
        subtitle={t("subscriber.mineHint", "العقارات التي اشتريت إعلانها. العقار الذي فيه متابعة جديدة يظهر أولاً.")}
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex-1">
          <SubscriberFilters value={filters} onChange={setFilters} />
        </div>
        <div className="inline-flex shrink-0 self-start rounded-lg border border-border p-0.5" role="tablist">
          {[
            { id: "list", icon: List, label: t("subscriber.viewList", "قائمة") },
            { id: "map", icon: MapIcon, label: t("subscriber.viewMap", "خارطة") },
          ].map(({ id, icon, label }) => {
            const Icon = icon
            return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={cn(
                "inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-4 text-sm font-medium",
                view === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist">
        {["", "active", "sold", "expired", "cancelled"].map((st) => (
          <button
            key={st || "all"}
            type="button"
            role="tab"
            aria-selected={status === st}
            onClick={() => setStatus(st)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              status === st ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {st ? t(`subscriber.ad.${st}`, st) : t("subscriber.ad.all", "الكل")}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="py-10 text-center text-sm text-destructive">{t("subscriber.loadError", "تعذر تحميل العقارات")}</p>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-muted-foreground">{t("subscriber.emptyMine", "لم تشترِ أي إعلان بعد.")}</p>
          <Button className="mt-3" variant="outline" onClick={() => navigate("/subscriber/requests")}>
            {t("subscriber.tabs.available", "طلبات التسويق")}
          </Button>
        </div>
      ) : view === "map" ? (
        <div className="relative h-[65vh] min-h-[360px] overflow-hidden rounded-xl border border-border">
          <ListingsPriceMap
            markers={markers}
            fitKey={JSON.stringify(params)}
            onSelect={(m) => navigate(`/subscriber/listings/${m.id}`)}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((row) => (
              <SubscriberListingCard
                key={row.id}
                product={row.product}
                to={`/subscriber/listings/${row.product?.id}`}
                unreadCount={row.unread_count}
                footer={
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <AdStatusBadge status={row.status} daysLeft={row.days_left} />
                    <NotesMeta notesCount={row.notes_count} lastNoteAt={row.last_note_at} unreadCount={row.unread_count} />
                  </div>
                }
              />
            ))}
          </div>
          {query.hasNextPage ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                {query.isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : t("subscriber.loadMore", "عرض المزيد")}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
