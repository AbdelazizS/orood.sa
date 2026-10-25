import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getVideo, recordVideoView, toggleVideoLike } from "@/services/companyVideoService"
import { useAuthStore } from "@/store/useAuthStore"
import { VideoComments } from "@/components/company/videos/VideoComments"
import { VideoChannelRow } from "@/components/company/videos/VideoChannelRow"
import { ViewListingButton } from "@/components/company/videos/ViewListingButton"
import { formatCount } from "@/lib/video/videoFormat"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ArrowLeft, Home, MessageSquare, ThumbsUp, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

function ShortSlide({ video, active, muted, onToggleMute, onOpenComments, registerPlayer }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const ref = useRef(null)
  const [liked, setLiked] = useState({ on: video.liked_by_me, count: video.likes_count })

  useEffect(() => registerPlayer(video.id, ref.current), [registerPlayer, video.id])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (active) {
      el.currentTime = 0
      el.play().catch(() => {})
      recordVideoView(video.id).catch(() => {})
    } else {
      el.pause()
    }
  }, [active, video.id])

  const like = useMutation({
    mutationFn: () => toggleVideoLike(video.id),
    onSuccess: (res) => {
      setLiked({ on: res.liked, count: res.likes_count })
      queryClient.invalidateQueries({ queryKey: ["video", String(video.id)] })
    },
  })

  return (
    <section data-short-id={video.id} className="relative flex h-full snap-start snap-always items-center justify-center bg-black">
      <video
        ref={ref}
        src={video.url}
        poster={video.thumbnail_url ?? undefined}
        loop
        muted={muted}
        playsInline
        preload="metadata"
        onClick={(e) => (e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause())}
        className="h-full max-h-full w-auto max-w-full object-contain sm:aspect-[9/16] sm:object-cover"
      />

      {/* Bottom overlay: channel, title, linked property */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pb-6 pe-20 text-white">
        <div className="pointer-events-auto space-y-2">
          <VideoChannelRow company={video.company} owner={video.owner} light />
          <p className="text-sm font-semibold leading-snug">{video.title}</p>
          {video.description ? <p className="line-clamp-2 text-xs text-white/80">{video.description}</p> : null}
          {video.product ? <ViewListingButton product={video.product} className="mt-1" /> : null}
        </div>
      </div>

      {/* Side actions, like Shorts */}
      <div className="absolute bottom-24 end-3 flex flex-col items-center gap-4 text-white">
        <button
          type="button"
          onClick={() => (user ? like.mutate() : navigate("/login", { state: { redirectTo: `/shorts/${video.id}` } }))}
          className="flex flex-col items-center gap-1"
          aria-pressed={liked.on}
          aria-label={t("companyChannel.like", "إعجاب")}
        >
          <span className={cn("flex size-11 items-center justify-center rounded-full bg-white/15", liked.on && "bg-white text-black")}>
            <ThumbsUp className={cn("size-5", liked.on && "fill-current")} />
          </span>
          <span className="text-xs font-semibold tabular-nums">{formatCount(liked.count, i18n.language)}</span>
        </button>
        <button type="button" onClick={() => onOpenComments(video)} className="flex flex-col items-center gap-1" aria-label={t("videoComments.titleShort", "التعليقات")}>
          <span className="flex size-11 items-center justify-center rounded-full bg-white/15">
            <MessageSquare className="size-5" />
          </span>
          <span className="text-xs font-semibold tabular-nums">{formatCount(video.comments_count, i18n.language)}</span>
        </button>
        <button type="button" onClick={onToggleMute} className="flex size-11 items-center justify-center rounded-full bg-white/15" aria-label={muted ? t("companyChannel.unmute", "تشغيل الصوت") : t("companyChannel.mute", "كتم الصوت")}>
          {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
      </div>
    </section>
  )
}

/**
 * Full-screen vertical Shorts viewer: swipe/scroll between the channel's Shorts, autoplay the visible one,
 * comments in a side sheet (timestamps seek the current Short).
 */
export function ShortsViewerPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const players = useRef(new Map())
  const [activeId, setActiveId] = useState(Number(id))
  const [muted, setMuted] = useState(true)
  const [commentsFor, setCommentsFor] = useState(null)

  const { data, isLoading, isError } = useQuery({ queryKey: ["video", String(id)], queryFn: () => getVideo(id), staleTime: 60_000 })
  const list = useMemo(() => (data?.video ? [data.video, ...data.upNext.filter((v) => v.is_short)] : []), [data])

  const registerPlayer = useCallback((videoId, el) => {
    if (el) players.current.set(videoId, el)
    return () => players.current.delete(videoId)
  }, [])

  // Play whichever Short is mostly on screen.
  useEffect(() => {
    const root = containerRef.current
    if (!root || !list.length) return undefined
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.6) setActiveId(Number(e.target.getAttribute("data-short-id")))
        })
      },
      { root, threshold: [0.6] },
    )
    root.querySelectorAll("[data-short-id]").forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [list])

  // Keep the URL on the visible Short (shareable).
  useEffect(() => {
    if (activeId && String(activeId) !== String(id) && list.some((v) => v.id === activeId)) {
      window.history.replaceState(null, "", `/shorts/${activeId}`)
    }
  }, [activeId, id, list])

  if (isLoading) return <div className="h-[100dvh] animate-pulse bg-black" />
  if (isError || !data?.video) {
    return <p className="px-4 py-16 text-center text-muted-foreground">{t("companyChannel.notFound", "الفيديو غير متاح.")}</p>
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <div className="absolute start-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
          aria-label={t("common.back", "رجوع")}
        >
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </button>
        <button type="button" onClick={() => navigate("/")} className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur" aria-label={t("nav.home", "الرئيسية")}>
          <Home className="size-5" />
        </button>
      </div>

      <div ref={containerRef} className="mx-auto h-full w-full max-w-[480px] snap-y snap-mandatory overflow-y-auto [scrollbar-width:none]">
        {list.map((v) => (
          <div key={v.id} className="h-full">
            <ShortSlide
              video={v}
              active={activeId === v.id}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onOpenComments={setCommentsFor}
              registerPlayer={registerPlayer}
            />
          </div>
        ))}
      </div>

      <Sheet open={Boolean(commentsFor)} onOpenChange={(o) => !o && setCommentsFor(null)}>
        <SheetContent side="start" className="z-[110] w-full max-w-none overflow-y-auto sm:w-[440px] sm:max-w-[440px]">
          <SheetHeader className="border-b border-border">
            <SheetTitle>{t("videoComments.titleShort", "التعليقات")}</SheetTitle>
          </SheetHeader>
          {commentsFor ? (
            <div className="p-4">
              <VideoComments
                video={commentsFor}
                onSeek={(s) => {
                  const el = players.current.get(commentsFor.id)
                  if (el) {
                    el.currentTime = s
                    el.play().catch(() => {})
                  }
                }}
                getCurrentTime={() => players.current.get(commentsFor.id)?.currentTime ?? 0}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
