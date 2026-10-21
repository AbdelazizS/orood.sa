import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getAvailableListings, getAvailableMap, getSubscriberSummary } from "@/services/subscriberService"
import { SubscriberFilters } from "@/components/subscriber/SubscriberFilters"
import { SubscriberPageHeader } from "@/components/subscriber/SubscriberPageHeader"
import { SubscriberListingCard } from "@/components/subscriber/SubscriberListingCard"
import { BuyAdButton } from "@/components/subscriber/BuyAdButton"
import { ListingsPriceMap } from "@/components/maps/ListingsPriceMap.jsx"
import { EMPTY_SUBSCRIBER_FILTERS, subscriberFilterParams } from "@/lib/subscriber/subscriberFormat"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { List, Loader2, Map as MapIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * "طلبات التسويق": listings awaiting a marketer, as a list or on the map, with "شراء الإعلان".
 */
export function SubscriberAvailablePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filters, setFilters] = useState(EMPTY_SUBSCRIBER_FILTERS)
  const [view, setView] = useState("list")
  const params = subscriberFilterParams(filters)

  const { data: summary } = useQuery({ queryKey: ["subscriber", "summary"], queryFn: getSubscriberSummary })

  const listQuery = useInfiniteQuery({
    queryKey: ["subscriber", "available", params],
    queryFn: ({ pageParam }) => getAvailableListings({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta?.current_page < last.meta?.last_page ? last.meta.current_page + 1 : undefined,
    placeholderData: keepPreviousData,
    enabled: view === "list",
  })

  const mapQuery = useQuery({
    queryKey: ["subscriber", "available-map", params],
    queryFn: () => getAvailableMap(params),
    placeholderData: keepPreviousData,
    enabled: view === "map",
  })

  const items = useMemo(() => (listQuery.data?.pages ?? []).flatMap((p) => p.items), [listQuery.data])
  const total = listQuery.data?.pages?.[0]?.meta?.total

  const markers = useMemo(
    () =>
      (mapQuery.data ?? []).map((m) => ({
        ...m,
        lat: Number(m.lat),
        lng: Number(m.lng),
        pin_label: t("subscriber.mapPin", "طلب تسويق"),
      })),
    [mapQuery.data, t],
  )

  return (
    <div className="space-y-4">
      <SubscriberPageHeader
        title={t("subscriber.tabs.available", "طلبات التسويق")}
        subtitle={t("subscriber.availableHint", "عقارات أضافها أصحابها وتحتاج مسوق. اطّلع على التفاصيل ثم اشترِ الإعلان.")}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
            {t("subscriber.stats.balance", "الرصيد المتبقي")}: <strong className="tabular-nums">{summary?.credits_balance ?? "—"}</strong>
          </span>
        }
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

      {view === "map" ? (
        <div className="relative h-[65vh] min-h-[360px] overflow-hidden rounded-xl border border-border">
          <ListingsPriceMap
            markers={markers}
            fitKey={JSON.stringify(params)}
            onSelect={(m) => navigate(`/subscriber/listings/${m.id}`)}
          />
          {!mapQuery.isFetching && markers.length === 0 ? (
            <span className="absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow">
              {t("subscriber.emptyAvailable", "لا توجد عقارات تحتاج تسويق بهذه المواصفات")}
            </span>
          ) : null}
        </div>
      ) : listQuery.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : listQuery.isError ? (
        <p className="py-10 text-center text-sm text-destructive">{t("subscriber.loadError", "تعذر تحميل العقارات")}</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t("subscriber.emptyAvailable", "لا توجد عقارات تحتاج تسويق بهذه المواصفات")}
        </p>
      ) : (
        <>
          {total != null ? (
            <p className="text-xs text-muted-foreground">{t("subscriber.availableCount", { count: total, defaultValue: "{{count}} عقار بانتظار مسوق" })}</p>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((p) => (
              <SubscriberListingCard
                key={p.id}
                product={p}
                to={`/subscriber/listings/${p.id}`}
                badge={
                  <span className="rounded-full bg-zinc-600/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {t("listingsMap.awaitingPin", "انتظار")}
                  </span>
                }
                footer={
                  <div className="flex items-center justify-between gap-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/subscriber/listings/${p.id}`)}>
                      {t("listingsMap.viewDetails", "عرض التفاصيل")}
                    </Button>
                    <BuyAdButton product={p} creditsBalance={summary?.credits_balance} size="sm" />
                  </div>
                }
              />
            ))}
          </div>
          {listQuery.hasNextPage ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => listQuery.fetchNextPage()} disabled={listQuery.isFetchingNextPage}>
                {listQuery.isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : t("subscriber.loadMore", "عرض المزيد")}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
