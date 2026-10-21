import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useAuthStore } from "@/store/useAuthStore"
import {
  addVideoComment,
  deleteVideoComment,
  getVideoComments,
  moderateVideoComment,
  toggleVideoCommentLike,
} from "@/services/companyVideoService"
import { formatDuration, splitTimestamps } from "@/lib/video/videoFormat"
import { timeAgo } from "@/lib/timeAgo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  BadgeCheck,
  ChevronDown,
  Clock,
  EyeOff,
  Heart,
  Loader2,
  MoreVertical,
  Pin,
  ThumbsUp,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"

function errorText(err, t) {
  const first = Object.values(err?.response?.data?.errors ?? {})[0]?.[0]
  return first ?? err?.response?.data?.message ?? t("common.errorGeneric", "حدث خطأ")
}

/** Comment text with "02:15" turned into buttons that seek the player. */
function CommentBody({ text, onSeek }) {
  const parts = useMemo(() => splitTimestamps(text), [text])
  return (
    <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground">
      {parts.map((p, i) =>
        p.type === "time" && onSeek ? (
          <button
            key={i}
            type="button"
            onClick={() => onSeek(p.seconds)}
            className="rounded px-0.5 font-semibold text-sky-600 hover:underline dark:text-sky-400"
            dir="ltr"
          >
            {p.value}
          </button>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </p>
  )
}

function Composer({ videoId, parentId, getCurrentTime, onDone, autoFocus, placeholder }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [body, setBody] = useState("")
  const [atMoment, setAtMoment] = useState(false)
  const current = getCurrentTime ? Math.floor(getCurrentTime() || 0) : 0

  const send = useMutation({
    mutationFn: () =>
      addVideoComment(videoId, {
        body: body.trim(),
        parentId,
        timestampSec: !parentId && atMoment && getCurrentTime ? Math.floor(getCurrentTime() || 0) : undefined,
      }),
    onSuccess: () => {
      setBody("")
      setAtMoment(false)
      queryClient.invalidateQueries({ queryKey: ["video-comments", videoId] })
      queryClient.invalidateQueries({ queryKey: ["video", String(videoId)] })
      onDone?.()
    },
    onError: (err) => toast.error(errorText(err, t)),
  })

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (body.trim()) send.mutate()
      }}
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={parentId ? 2 : 3}
        maxLength={2000}
        autoFocus={autoFocus}
        placeholder={placeholder ?? t("videoComments.placeholder", "أضف تعليقاً… اكتب 01:30 لتشير إلى لحظة في الفيديو")}
        className="resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && body.trim()) send.mutate()
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!parentId && getCurrentTime ? (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={atMoment} onCheckedChange={(v) => setAtMoment(v === true)} />
            <Clock className="size-3.5" aria-hidden />
            {t("videoComments.atMoment", { time: formatDuration(current), defaultValue: "علّق عند هذه اللحظة ({{time}})" })}
          </label>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          {onDone && parentId ? (
            <Button type="button" variant="ghost" size="sm" onClick={onDone}>
              {t("common.cancel", "إلغاء")}
            </Button>
          ) : null}
          <Button type="submit" size="sm" disabled={!body.trim() || send.isPending}>
            {send.isPending ? <Loader2 className="size-4 animate-spin" /> : parentId ? t("videoComments.reply", "رد") : t("videoComments.post", "تعليق")}
          </Button>
        </div>
      </div>
    </form>
  )
}

function CommentItem({ comment, video, canModerate, isOwner, onSeek, getCurrentTime, isReply = false }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [replying, setReplying] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["video-comments", video.id] })
    queryClient.invalidateQueries({ queryKey: ["video", String(video.id)] })
  }

  const like = useMutation({ mutationFn: () => toggleVideoCommentLike(comment.id), onSuccess: refresh, onError: (e) => toast.error(errorText(e, t)) })
  const moderate = useMutation({ mutationFn: (action) => moderateVideoComment(comment.id, action), onSuccess: refresh, onError: (e) => toast.error(errorText(e, t)) })
  const remove = useMutation({ mutationFn: () => deleteVideoComment(comment.id), onSuccess: refresh, onError: (e) => toast.error(errorText(e, t)) })

  const replies = comment.replies ?? []
  const author = comment.author ?? {}

  return (
    <div className={cn("flex gap-3", comment.is_hidden && "opacity-60")}>
      <Avatar className={cn("shrink-0", isReply ? "size-7" : "size-9")}>
        {author.avatar_url ? <AvatarImage src={author.avatar_url} alt="" /> : null}
        <AvatarFallback className="text-xs">{author.name?.charAt(0) ?? "?"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        {comment.is_pinned ? (
          <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <Pin className="size-3" aria-hidden />
            {t("videoComments.pinned", { name: video.company?.name ?? "", defaultValue: "مثبّت من {{name}}" })}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span
            className={cn(
              "font-semibold",
              author.is_channel_owner ? "rounded-full bg-foreground px-2 py-0.5 text-background" : "text-foreground",
            )}
          >
            {author.name}
          </span>
          {author.is_verified_company ? (
            <BadgeCheck className="size-4 text-sky-500" aria-label={t("videoComments.verifiedCompany", "شركة موثّقة")} />
          ) : null}
          <span className="text-muted-foreground">{timeAgo(comment.created_at, t)}</span>
          {comment.timestamp_sec != null && onSeek ? (
            <button
              type="button"
              onClick={() => onSeek(comment.timestamp_sec)}
              className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700 hover:bg-sky-500/20 dark:text-sky-300"
              dir="ltr"
            >
              <Clock className="size-3" aria-hidden />
              {formatDuration(comment.timestamp_sec)}
            </button>
          ) : null}
          {comment.is_hidden ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              <EyeOff className="size-3" aria-hidden />
              {t("videoComments.hidden", "مخفي عن الجمهور")}
            </span>
          ) : null}
        </div>

        <div className="mt-1">
          <CommentBody text={comment.body} onSeek={onSeek} />
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 gap-1.5 px-2", comment.liked_by_me && "text-primary")}
            disabled={!user || like.isPending}
            onClick={() => like.mutate()}
            aria-pressed={comment.liked_by_me}
          >
            <ThumbsUp className={cn("size-4", comment.liked_by_me && "fill-current")} aria-hidden />
            <span className="tabular-nums">{comment.likes_count || ""}</span>
          </Button>
          {!isReply && user ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setReplying((v) => !v)}>
              {t("videoComments.reply", "رد")}
            </Button>
          ) : null}
          {comment.owner_hearted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
              <Heart className="size-3 fill-current" aria-hidden />
              {t("videoComments.hearted", "أعجب الشركة")}
            </span>
          ) : null}

          {isOwner || canModerate || comment.can_delete ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={t("videoComments.options", "خيارات")}>
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwner && !isReply ? (
                  <DropdownMenuItem onClick={() => moderate.mutate("pin")}>
                    <Pin className="me-2 size-4" />
                    {comment.is_pinned ? t("videoComments.unpin", "إلغاء التثبيت") : t("videoComments.pin", "تثبيت التعليق")}
                  </DropdownMenuItem>
                ) : null}
                {isOwner ? (
                  <DropdownMenuItem onClick={() => moderate.mutate("heart")}>
                    <Heart className="me-2 size-4" />
                    {comment.owner_hearted ? t("videoComments.unheart", "إزالة الإعجاب") : t("videoComments.heart", "إعجاب من الشركة")}
                  </DropdownMenuItem>
                ) : null}
                {canModerate ? (
                  <DropdownMenuItem onClick={() => moderate.mutate("hide")}>
                    <EyeOff className="me-2 size-4" />
                    {comment.is_hidden ? t("videoComments.unhide", "إظهار التعليق") : t("videoComments.hide", "إخفاء التعليق")}
                  </DropdownMenuItem>
                ) : null}
                {comment.can_delete ? (
                  <DropdownMenuItem className="text-destructive" onClick={() => remove.mutate()}>
                    <Trash2 className="me-2 size-4" />
                    {t("videoComments.delete", "حذف")}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {replying ? (
          <div className="mt-2">
            <Composer
              videoId={video.id}
              parentId={comment.id}
              autoFocus
              placeholder={t("videoComments.replyTo", { name: author.name ?? "", defaultValue: "الرد على {{name}}…" })}
              onDone={() => {
                setReplying(false)
                setShowReplies(true)
              }}
            />
          </div>
        ) : null}

        {replies.length ? (
          <div className="mt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2 text-xs font-semibold text-sky-600 dark:text-sky-400"
              onClick={() => setShowReplies((v) => !v)}
            >
              <ChevronDown className={cn("size-4 transition-transform", showReplies && "rotate-180")} aria-hidden />
              {t("videoComments.replies", { count: replies.length, defaultValue: "{{count}} ردود" })}
            </Button>
            {showReplies ? (
              <div className="mt-2 space-y-3">
                {replies.map((r) => (
                  <CommentItem
                    key={r.id}
                    comment={r}
                    video={video}
                    canModerate={canModerate}
                    isOwner={isOwner}
                    onSeek={onSeek}
                    getCurrentTime={getCurrentTime}
                    isReply
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Video comments — YouTube-style plus: pinned + hearted by the company, verified company badge,
 * clickable timestamps and "comment at this moment", sort by top / newest.
 * @param {{ video: object, onSeek?: (sec: number) => void, getCurrentTime?: () => number, className?: string }} props
 */
export function VideoComments({ video, onSeek, getCurrentTime, className }) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const [sort, setSort] = useState("top")

  const query = useInfiniteQuery({
    queryKey: ["video-comments", video.id, sort],
    queryFn: ({ pageParam }) => getVideoComments(video.id, { sort, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta?.current_page < last.meta?.last_page ? last.meta.current_page + 1 : undefined),
  })

  const items = useMemo(() => (query.data?.pages ?? []).flatMap((p) => p.items), [query.data])
  const meta = query.data?.pages?.[0]?.meta ?? {}

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-bold">
          {t("videoComments.title", { count: meta.comments_count ?? video.comments_count ?? 0, defaultValue: "{{count}} تعليق" })}
        </h2>
        <div className="inline-flex gap-1" role="tablist">
          {[
            { id: "top", label: t("videoComments.sortTop", "الأهم") },
            { id: "new", label: t("videoComments.sortNew", "الأحدث") },
          ].map((o) => (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={sort === o.id}
              onClick={() => setSort(o.id)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-semibold",
                sort === o.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {user ? (
        <Composer videoId={video.id} getCurrentTime={getCurrentTime} />
      ) : (
        <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
          <Link to="/login" state={{ redirectTo: `/videos/${video.id}` }} className="font-semibold text-primary hover:underline">
            {t("videoComments.login", "سجّل الدخول")}
          </Link>{" "}
          {t("videoComments.loginHint", "لتكتب تعليقاً أو ترد على الآخرين.")}
        </p>
      )}

      {query.isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("videoComments.empty", "كن أول من يعلّق.")}</p>
      ) : (
        <div className="space-y-5">
          {items.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              video={video}
              canModerate={Boolean(meta.can_moderate)}
              isOwner={Boolean(meta.is_owner)}
              onSeek={onSeek}
              getCurrentTime={getCurrentTime}
            />
          ))}
        </div>
      )}

      {query.hasNextPage ? (
        <Button variant="outline" className="w-full" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
          {query.isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : t("videoComments.more", "المزيد من التعليقات")}
        </Button>
      ) : null}
    </section>
  )
}
