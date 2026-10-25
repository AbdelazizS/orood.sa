import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { toggleVideoLike } from "@/services/companyVideoService"
import { useAuthStore } from "@/store/useAuthStore"
import { useFiltersStore } from "@/store/useFiltersStore"
import { useAppDirection } from "@/providers/DirectionProvider"
import { useRegions } from "@/hooks/useRegions"
import { ViewListingButton } from "@/components/company/videos/ViewListingButton"
import { VideoChannelRow } from "@/components/company/videos/VideoChannelRow"
import { DistrictCombobox } from "@/components/filters/DistrictCombobox"
import { formatCount } from "@/lib/video/videoFormat"
import { formatShortPrice } from "@/lib/formatShortPrice"
import { SeoHead } from "@/components/seo/SeoHead"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Clapperboard, Loader2, Map as MapIcon, MessageCircle, ThumbsUp, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

const PER_PAGE = 8

/** Height of a fixed/sticky element (0 while hidden). */
function useElementHeight(selector) {
  const [height, setHeight] = useState(0)
  useEffect(() => {
    const el = document.querySelector(selector)
    if (!el || typeof ResizeObserver === "undefined") return undefined
    const ro = new ResizeObserver(([entry]) => setHeight(Math.round(entry.target.getBoundingClientRect().height)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [selector])
  return height
}

function FeedItem({ video, active, muted, onToggleMute }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const ref = useRef(null)
  const [liked, setLiked] = useState({ on: Boolean(video.liked_by_me), count: video.likes_count ?? 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (active) {
      el.play().catch(() => {})
    } else {
      el.pause()
    }
  }, [active])

  const like = useMutation({
    mutationFn: () => toggleVideoLike(video.id),
    onMutate: () => setLiked((l) => ({ on: !l.on, count: l.count + (l.on ? -1 : 1) })),
    onSuccess: (res) => res && setLiked({ on: Boolean(res.liked), count: res.likes_count ?? 0 }),
  })

  const product = video.product
  const price = product ? formatShortPrice(product.price, i18n.language) : null

  return (
    <section className="relative flex h-full w-full snap-start snap-always items-center justify-center bg-black" aria-label={video.title}>
      <video
        ref={ref}
        src={video.url ?? undefined}
        poster={video.thumbnail_url ?? undefined}
        className="h-full w-full object-contain sm:w-auto sm:max-w-full sm:aspect-[9/16] sm:object-cover"
        playsInline
        loop
        muted={muted}
        preload={active ? "auto" : "metadata"}
        onClick={(e) => (e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause())}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-4 pe-20 text-white">
        <div className="pointer-events-auto space-y-2">
          <VideoChannelRow company={video.company} owner={video.owner} light />
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{video.title}</p>
          {product ? (
            <>
              <p className="text-xs text-white/80">
                {[price ? `${price} ${t("common.currency", "ريال")}` : null, product.city, product.district].filter(Boolean).join(" · ")}
              </p>
              <ViewListingButton product={product} />
            </>
          ) : null}
        </div>
      </div>

      <div className="absolute bottom-24 end-3 flex flex-col items-center gap-4 text-white">
        <button
          type="button"
          onClick={() => (user ? like.mutate() : navigate("/login", { state: { redirectTo: "/videos" } }))}
          className="flex flex-col items-center gap-1"
          aria-pressed={liked.on}
          aria-label={t("companyChannel.like", "إعجاب")}
        >
          <span className={cn("flex size-11 items-center justify-center rounded-full bg-black/45", liked.on && "text-sky-400")}>
            <ThumbsUp className={cn("size-5", liked.on && "fill-current")} aria-hidden />
          </span>
          <span className="text-xs font-semibold tabular-nums">{formatCount(liked.count, i18n.language)}</span>
        </button>
        <Link to={`/videos/${video.id}`} className="flex flex-col items-center gap-1" aria-label={t("companyChannel.comments", "التعليقات")}>
          <span className="flex size-11 items-center justify-center rounded-full bg-black/45">
            <MessageCircle className="size-5" aria-hidden />
          </span>
          <span className="text-xs font-semibold tabular-nums">{formatCount(video.comments_count ?? 0, i18n.language)}</span>
        </Link>
        <button
          type="button"
          onClick={onToggleMute}
          className="flex size-11 items-center justify-center rounded-full bg-black/45"
          aria-label={muted ? t("companyChannel.unmute", "تشغيل الصوت") : t("companyChannel.mute", "كتم الصوت")}
        >
          {muted ? <VolumeX className="size-5" aria-hidden /> : <Volume2 className="size-5" aria-hidden />}
        </button>
      </div>
    </section>
  )
}

/**
 * «فيديوهات» — newest videos on the platform, TikTok-style. Pick the section (عقارات، سيارات…),
 * then the city / district; each video links to its listing («عرض العقار / عرض التفاصيل»).
 */
export function VideosFeedPage() {
  const { t, i18n } = useTranslation()
  const { direction } = useAppDirection()
  const headerHeight = useElementHeight("header")
  const bottomNavHeight = useElementHeight("[data-bottom-nav]")
  const { categoryId, regionId, cityId, district, setCategory, setRegion, setCity, setDistrict } = useFiltersStore()
  const { data: regions = [] } = useRegions()
  const cities = regions.find((r) => r.id === regionId)?.cities ?? []

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get("/categories")
      return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
    },
    staleTime: 10 * 60_000,
  })

  const feed = useInfiniteQuery({
    queryKey: ["videos", "feed", categoryId, cityId, cityId ? district : null],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await apiClient.get("/videos/feed", {
        params: {
          page: pageParam,
          per_page: PER_PAGE,
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

  // The video at least 60% on screen plays; the others pause. Load more near the end.
  const scrollerRef = useRef(null)
  const [activeId, setActiveId] = useState(null)
  const [muted, setMuted] = useState(true)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed
  useEffect(() => {
    const root = scrollerRef.current
    if (!root || typeof IntersectionObserver === "undefined") return undefined
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const id = Number(entry.target.dataset.videoId)
            setActiveId(id)
            const index = videos.findIndex((v) => v.id === id)
            if (index >= videos.length - 2 && hasNextPage && !isFetchingNextPage) fetchNextPage()
          }
        }
      },
      { root, threshold: [0.6] },
    )
    root.querySelectorAll("[data-video-id]").forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [videos, hasNextPage, isFetchingNextPage, fetchNextPage])

  const effectiveActiveId = activeId ?? videos[0]?.id ?? null
  const chip = (active) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50",
    )

  return (
    <div
      dir={direction}
      className="flex flex-col bg-background"
      style={{ height: `calc(100dvh - ${headerHeight || 64}px - ${bottomNavHeight}px)` }}
    >
      <SeoHead path="/videos" title={t("videos.pageTitle", "فيديوهات عروض")} />
      <div className="shrink-0 space-y-2 border-b border-border px-2 py-2 sm:px-4">
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
        <div className="grid grid-cols-3 gap-2">
          <Select value={regionId ? String(regionId) : "all"} onValueChange={(v) => setRegion(v === "all" ? null : Number(v))}>
            <SelectTrigger className="h-9 w-full min-w-0 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allRegions", "جميع المناطق")}</SelectItem>
              {regions.map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cityId ? String(cityId) : "all"} onValueChange={(v) => setCity(v === "all" ? null : Number(v))} disabled={!regionId}>
            <SelectTrigger className="h-9 w-full min-w-0 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allCities", "جميع المدن")}</SelectItem>
              {cities.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <DistrictCombobox cityId={cityId} value={district} onChange={setDistrict} allowAll triggerClassName="h-9 text-xs" />
        </div>
      </div>

      <div ref={scrollerRef} className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain bg-black [scrollbar-width:none]">
        {feed.isLoading ? (
          <div className="flex h-full items-center justify-center text-white/70">
            <Loader2 className="size-7 animate-spin" aria-hidden />
          </div>
        ) : videos.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-white/80">
            <Clapperboard className="size-10 opacity-60" aria-hidden />
            <p className="text-sm">{t("videos.empty", "لا توجد فيديوهات بهذه الخيارات بعد")}</p>
          </div>
        ) : (
          videos.map((v) => (
            <div key={v.id} data-video-id={v.id} className="h-full">
              <FeedItem
                video={v}
                active={v.id === effectiveActiveId}
                muted={muted}
                onToggleMute={() => setMuted((m) => !m)}
              />
            </div>
          ))
        )}
        {isFetchingNextPage ? (
          <div className="flex justify-center py-4 text-white/70"><Loader2 className="size-6 animate-spin" aria-hidden /></div>
        ) : null}
      </div>
    </div>
  )
}
