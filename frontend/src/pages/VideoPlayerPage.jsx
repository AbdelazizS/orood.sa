import { useCallback, useEffect, useRef, useState } from "react"
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { getVideo, recordVideoView, toggleVideoLike } from "@/services/companyVideoService"
import { useAuthStore } from "@/store/useAuthStore"
import { useAppDirection } from "@/providers/DirectionProvider"
import { VideoComments } from "@/components/company/videos/VideoComments"
import { VideoChannelRow } from "@/components/company/videos/VideoChannelRow"
import { LinkedListingCard } from "@/components/company/videos/LinkedListingCard"
import { formatCount, formatDuration } from "@/lib/video/videoFormat"
import { timeAgo } from "@/lib/timeAgo"
import { SeoHead } from "@/components/seo/SeoHead"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EyeOff, Share2, ThumbsUp } from "lucide-react"
import { cn } from "@/lib/utils"

function UpNextItem({ video }) {
  const { t, i18n } = useTranslation()
  return (
    <Link to={`/videos/${video.id}`} className="group flex gap-2 rounded-lg p-1 hover:bg-muted/60">
      <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-muted">
        {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="size-full object-cover" loading="lazy" /> : null}
        {video.duration_sec ? (
          <span className="absolute bottom-1 end-1 rounded bg-black/80 px-1 text-[10px] font-semibold text-white" dir="ltr">
            {formatDuration(video.duration_sec)}
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{video.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("companyChannel.views", { formatted: formatCount(video.views_count, i18n.language), defaultValue: "{{formatted}} مشاهدة" })}
        </p>
      </div>
    </Link>
  )
}

/**
 * Watch page for a company video: player, title, like/share, channel, description,
 * the linked property, comments (timestamps seek the player) and "up next" from the same channel.
 */
export function VideoPlayerPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
  const { direction } = useAppDirection()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const playerRef = useRef(null)
  const commentsRef = useRef(null)
  const viewedRef = useRef(null)
  const [expanded, setExpanded] = useState(false)

  const { data, isLoading, isError } = useQuery({ queryKey: ["video", String(id)], queryFn: () => getVideo(id) })
  const video = data?.video

  const like = useMutation({
    mutationFn: () => toggleVideoLike(id),
    onSuccess: (res) =>
      queryClient.setQueryData(["video", String(id)], (old) =>
        old ? { ...old, video: { ...old.video, liked_by_me: res.liked, likes_count: res.likes_count } } : old,
      ),
  })

  const seek = useCallback((seconds) => {
    const el = playerRef.current
    if (!el) return
    el.currentTime = seconds
    el.play?.().catch(() => {})
    el.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [])
  const getCurrentTime = useCallback(() => playerRef.current?.currentTime ?? 0, [])

  // Deep link from a notification: /videos/:id?comment=… → jump to the comments.
  useEffect(() => {
    if (video && searchParams.get("comment")) {
      commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [video, searchParams])

  const onPlay = () => {
    if (viewedRef.current === id) return
    viewedRef.current = id
    recordVideoView(id).catch(() => {})
  }

  const share = async () => {
    const url = window.location.href.split("?")[0]
    try {
      if (navigator.share) await navigator.share({ title: video?.title, url })
      else {
        await navigator.clipboard.writeText(url)
        toast.success(t("companyChannel.linkCopied", "تم نسخ الرابط"))
      }
    } catch {
      /* user cancelled */
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-6 w-2/3" />
      </div>
    )
  }
  if (isError || !video) {
    return <p className="px-4 py-16 text-center text-muted-foreground">{t("companyChannel.notFound", "الفيديو غير متاح.")}</p>
  }
  if (video.is_short) return <Navigate to={`/shorts/${video.id}`} replace />

  return (
    <div dir={direction} className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <SeoHead title={video.title} description={video.description?.slice(0, 160)} path={`/videos/${video.id}`} image={video.thumbnail_url} />
      <div className="min-w-0 space-y-4">
        <div className="overflow-hidden rounded-xl bg-black">
          <video
            key={video.id}
            ref={playerRef}
            src={video.url}
            poster={video.thumbnail_url ?? undefined}
            controls
            playsInline
            preload="metadata"
            onPlay={onPlay}
            className="aspect-video w-full bg-black"
          />
        </div>

        {video.status === "hidden" ? (
          <p className="flex items-center gap-2 rounded-lg bg-muted p-2.5 text-sm text-muted-foreground">
            <EyeOff className="size-4" aria-hidden />
            {t("companyChannel.hiddenNotice", "هذا الفيديو مخفي عن الجمهور ويظهر لك فقط.")}
          </p>
        ) : null}

        <h1 className="text-xl font-bold leading-snug">{video.title}</h1>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <VideoChannelRow company={video.company} />
          <div className="flex gap-2">
            <Button
              variant={video.liked_by_me ? "default" : "outline"}
              className="gap-2 rounded-full"
              onClick={() => (user ? like.mutate() : navigate("/login", { state: { redirectTo: `/videos/${video.id}` } }))}
              aria-pressed={video.liked_by_me}
            >
              <ThumbsUp className={cn("size-4", video.liked_by_me && "fill-current")} aria-hidden />
              <span className="tabular-nums">{formatCount(video.likes_count, i18n.language)}</span>
            </Button>
            <Button variant="outline" className="gap-2 rounded-full" onClick={share}>
              <Share2 className="size-4" aria-hidden />
              {t("companyChannel.share", "مشاركة")}
            </Button>
          </div>
        </div>

        {/* Description box under the video, like YouTube */}
        <div className="rounded-xl bg-muted/60 p-3 text-sm">
          <p className="font-semibold">
            {t("companyChannel.views", { formatted: formatCount(video.views_count, i18n.language), defaultValue: "{{formatted}} مشاهدة" })}
            {" · "}
            {timeAgo(video.published_at ?? video.created_at, t)}
          </p>
          {video.description ? (
            <>
              <p className={cn("mt-1 whitespace-pre-line leading-relaxed", !expanded && "line-clamp-3")}>{video.description}</p>
              {video.description.length > 160 || video.description.includes("\n") ? (
                <button type="button" className="mt-1 text-xs font-semibold hover:underline" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? t("companyChannel.showLess", "عرض أقل") : t("companyChannel.showMore", "المزيد")}
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        <LinkedListingCard product={video.product} company={video.company} />

        <div ref={commentsRef}>
          <VideoComments video={video} onSeek={seek} getCurrentTime={getCurrentTime} />
        </div>
      </div>

      <aside className="min-w-0 space-y-2">
        <h2 className="text-sm font-bold">{t("companyChannel.upNext", "المزيد من القناة")}</h2>
        {data.upNext.length ? (
          data.upNext.map((v) => <UpNextItem key={v.id} video={v} />)
        ) : (
          <p className="text-sm text-muted-foreground">{t("companyChannel.noMore", "لا توجد فيديوهات أخرى.")}</p>
        )}
      </aside>
    </div>
  )
}
