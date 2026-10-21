import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { formatCount, formatDuration } from "@/lib/video/videoFormat"
import { timeAgo } from "@/lib/timeAgo"
import { EyeOff, Play } from "lucide-react"
import { cn } from "@/lib/utils"

function Thumb({ video, className }) {
  return video.thumbnail_url ? (
    <img src={video.thumbnail_url} alt="" loading="lazy" className={cn("size-full object-cover", className)} />
  ) : (
    <div className={cn("flex size-full items-center justify-center bg-muted text-muted-foreground", className)}>
      <Play className="size-8" aria-hidden />
    </div>
  )
}

/** YouTube-style card for a regular video (16:9). */
export function VideoCard({ video, showChannel = false }) {
  const { t, i18n } = useTranslation()
  return (
    <Link to={`/videos/${video.id}`} className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
        <Thumb video={video} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        {video.duration_sec ? (
          <span className="absolute bottom-1.5 end-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums" dir="ltr">
            {formatDuration(video.duration_sec)}
          </span>
        ) : null}
        {video.status === "hidden" ? (
          <span className="absolute start-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-[11px] text-white">
            <EyeOff className="size-3" aria-hidden />
            {t("companyChannel.hidden", "مخفي")}
          </span>
        ) : null}
      </div>
      <div className="mt-2 space-y-0.5 px-0.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{video.title}</h3>
        {showChannel && video.company ? <p className="truncate text-xs text-muted-foreground">{video.company.name}</p> : null}
        <p className="text-xs text-muted-foreground">
          {t("companyChannel.views", { count: video.views_count, formatted: formatCount(video.views_count, i18n.language), defaultValue: "{{formatted}} مشاهدة" })}
          {" · "}
          {timeAgo(video.published_at ?? video.created_at, t)}
        </p>
      </div>
    </Link>
  )
}

/** Vertical 9:16 card for a Short. */
export function ShortCard({ video }) {
  const { t, i18n } = useTranslation()
  return (
    <Link
      to={`/shorts/${video.id}`}
      className="group block w-[150px] shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[170px]"
    >
      <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-muted">
        <Thumb video={video} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8">
          <p className="line-clamp-2 text-xs font-semibold text-white">{video.title}</p>
          <p className="mt-0.5 text-[11px] text-white/80">
            {t("companyChannel.views", { count: video.views_count, formatted: formatCount(video.views_count, i18n.language), defaultValue: "{{formatted}} مشاهدة" })}
          </p>
        </div>
      </div>
    </Link>
  )
}
