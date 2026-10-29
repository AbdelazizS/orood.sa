import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { useFiltersStore } from "@/store/useFiltersStore"
import { useAppDirection } from "@/providers/DirectionProvider"
import { useRegions } from "@/hooks/useRegions"
import { DistrictCombobox } from "@/components/filters/DistrictCombobox"
import { formatCount, formatDuration } from "@/lib/video/videoFormat"
import { SeoHead } from "@/components/seo/SeoHead"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Clapperboard, Loader2, Map as MapIcon, MapPin, Video } from "lucide-react"
import { cn } from "@/lib/utils"

const PER_PAGE = 18

/** Haraj-style vertical card: thumbnail, camera badge, duration, title, city, views. */
function VideoGridCard({ video }) {
  const { t, i18n } = useTranslation()
  const city = video.product?.city
  return (
    <Link
      to={`/videos/${video.id}`}
      className="group block overflow-hidden rounded-2xl bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[9/14] overflow-hidden">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Clapperboard className="size-8" aria-hidden />
          </div>
        )}
        <span className="absolute end-2 top-2 flex size-9 items-center justify-center rounded-xl bg-black/45 text-white backdrop-blur-sm">
          <Video className="size-5" aria-hidden />
        </span>
        {video.duration_sec ? (
          <span className="absolute start-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
            {formatDuration(video.duration_sec)}
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10 text-white">
          <p className="line-clamp-2 text-sm font-bold leading-snug">{video.title}</p>
          <p className="mt-1 flex items-center gap-2 text-xs text-white/85">
            {city ? (
              <span className="inline-flex min-w-0 items-center gap-1 truncate">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {city}
              </span>
            ) : null}
            <span className="shrink-0">
              {t("companyChannel.views", {
                count: video.views_count,
                formatted: formatCount(video.views_count, i18n.language),
                defaultValue: "{{formatted}} مشاهدة",
              })}
            </span>
          </p>
        </div>
      </div>
    </Link>
  )
}

/**
 * «فيديوهات» — newest platform videos as a grid (client's chosen layout, like Haraj):
 * pick the section, then city / district; a card opens the player with suggested videos.
 */
export function VideosFeedPage() {
  const { t, i18n } = useTranslation()
  const { direction } = useAppDirection()
  const { categoryId, regionId, cityId, district, setCategory, setRegion, setCity, setDistrict } = useFiltersStore()
  const { data: regions = [] } = useRegions()
  const cities = regions.find((r) => r.id === regionId)?.cities ?? []
  const [sort, setSort] = useState("latest")

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get("/categories")
      return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
    },
    staleTime: 10 * 60_000,
  })

  const feed = useInfiniteQuery({
    queryKey: ["videos", "feed", categoryId, cityId, cityId ? district : null, sort],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await apiClient.get("/videos/feed", {
        params: {
          page: pageParam,
          per_page: PER_PAGE,
          sort,
          category_id: categoryId || undefined,
          city_id: cityId || undefined,
          district: cityId && district ? district : undefined,
        },
      })
      return { items: data?.data ?? [], meta: data?.meta ?? {} }
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta?.has_more ? (last.meta.current_page ?? 1) + 1 : undefined),
  })
  const videos = useMemo(() => feed.data?.pages.flatMap((p) => p.items) ?? [], [feed.data])

  // Load the next page when the end of the grid comes into view.
  const sentinelRef = useRef(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || typeof IntersectionObserver === "undefined") return undefined
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
    }, { rootMargin: "400px" })
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const chip = (active) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50",
    )

  return (
    <div dir={direction} className="mx-auto w-full max-w-6xl pb-6">
      <SeoHead path="/videos" title={t("videos.pageTitle", "فيديوهات عروض")} />
      <div className="space-y-2 border-b border-border bg-background px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-muted" aria-label={t("common.back", "رجوع")}>
            <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
          </Link>
          <h1 className="flex items-center gap-1.5 text-base font-bold">
            <Clapperboard className="size-5 text-primary" aria-hidden />
            {t("nav.videos", "فيديوهات")}
          </h1>
          <Link
            to="/listings/map?view=videos"
            className="ms-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-semibold hover:bg-muted"
          >
            <MapIcon className="size-4" aria-hidden />
            {t("videos.onMap", "على الخارطة")}
          </Link>
        </div>
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          <button type="button" className={chip(categoryId == null)} onClick={() => setCategory(null)}>
            {t("filters.allSections", "كل الأقسام")}
          </button>
          {categories.map((c) => (
            <button key={c.id} type="button" className={chip(categoryId === c.id)} onClick={() => setCategory(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:max-w-xl">
          <Select value={regionId ? String(regionId) : "all"} onValueChange={(v) => setRegion(v === "all" ? null : Number(v))}>
            <SelectTrigger className="h-9 w-full min-w-0 px-2 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allRegions", "جميع المناطق")}</SelectItem>
              {regions.map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cityId ? String(cityId) : "all"} onValueChange={(v) => setCity(v === "all" ? null : Number(v))} disabled={!regionId}>
            <SelectTrigger className="h-9 w-full min-w-0 px-2 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allCities", "جميع المدن")}</SelectItem>
              {cities.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <DistrictCombobox cityId={cityId} value={district} onChange={setDistrict} allowAll triggerClassName="h-9 px-2 text-xs" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3 sm:px-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <Clapperboard className="size-4 text-primary" aria-hidden />
          {t("nav.videos", "فيديوهات")}
        </h2>
        <div className="flex gap-1 rounded-full bg-muted/60 p-1" role="tablist">
          {[
            { id: "latest", label: t("videos.latest", "الأحدث") },
            { id: "most_viewed", label: t("videos.mostViewed", "الأكثر مشاهدة") },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={sort === tab.id}
              onClick={() => setSort(tab.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                sort === tab.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 sm:px-4">
        {feed.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[9/14] rounded-2xl" />)}
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <Clapperboard className="size-10 opacity-60" aria-hidden />
            <p className="text-sm">{t("videos.empty", "لا توجد فيديوهات بهذه الخيارات بعد")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {videos.map((v) => <VideoGridCard key={v.id} video={v} />)}
          </div>
        )}
        <div ref={sentinelRef} className="h-4" />
        {isFetchingNextPage ? (
          <div className="flex justify-center py-4 text-muted-foreground"><Loader2 className="size-6 animate-spin" aria-hidden /></div>
        ) : null}
      </div>
    </div>
  )
}
