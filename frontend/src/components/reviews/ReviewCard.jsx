import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StarRating } from "@/components/ui/StarRating"
import { useAuthStore } from "@/store/useAuthStore"
import { MoreHorizontal, Pencil, Trash2, ShieldCheck, ThumbsUp, ThumbsDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function ReviewCard({
  review,
  onEdit,
  onDelete,
  onReact,
  showActions = true,
}) {
  const { user } = useAuthStore()
  const isOwn = review.is_own_review
  const likeCount = review.like_count ?? 0
  const dislikeCount = review.dislike_count ?? 0
  const userReaction = review.user_reaction
  const reply = review.reply

  return (
    <div
      className={cn(
        "flex gap-3 border-b border-border/60 py-4 last:border-0"
      )}
    >
      {/* Avatar on right (RTL: first) */}
      <Avatar className="h-9 w-9 shrink-0 order-first">
        <AvatarImage src={review.reviewer?.avatar_url} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {(review.reviewer?.username?.charAt(0) ?? review.reviewer?.name?.charAt(0) ?? "?").toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 text-start order-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs text-muted-foreground shrink-0">
            {review.human_time}
          </span>
          <div className="flex items-center gap-1.5">
            {isOwn && showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal size={12} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onEdit?.(review)}
                    className="gap-2 justify-end text-sm"
                  >
                    <span>تعديل</span>
                    <Pencil size={13} />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete?.(review.id)}
                    className="gap-2 justify-end text-destructive text-sm"
                  >
                    <span>حذف</span>
                    <Trash2 size={13} />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {review.reviewer?.is_verified && (
              <ShieldCheck size={12} className="shrink-0 text-primary" />
            )}
            <span className="text-sm font-semibold">
              {review.reviewer?.username ?? review.reviewer?.name ?? "—"}
            </span>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-end gap-2">
          <StarRating value={review.rating} readonly size="xs" />
          <span className="text-xs text-muted-foreground">
            {review.rating_label}
          </span>
        </div>

        {review.comment && (
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">
            {review.comment}
          </p>
        )}

        {reply && (
          <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 text-start">
            <span className={cn(
              "text-xs font-semibold",
              reply.is_platform ? "text-primary" : "text-muted-foreground"
            )}>
              {reply.is_platform ? "فريق المنصة" : "رد"}
            </span>
            <p className="mt-1 text-sm leading-relaxed text-foreground">
              {reply.text}
            </p>
          </div>
        )}
      </div>

      {/* Like/Dislike stacked vertically on far left (RTL: last) */}
      {!isOwn && user && onReact && (
        <div className="flex shrink-0 flex-col items-center gap-0.5 order-last">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-col gap-0 px-2 text-xs"
            onClick={() => onReact(review.id, userReaction === "like" ? null : "like")}
          >
            <ThumbsUp
              size={14}
              className={cn(userReaction === "like" && "fill-primary text-primary")}
            />
            <span>{likeCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-col gap-0 px-2 text-xs"
            onClick={() => onReact(review.id, userReaction === "dislike" ? null : "dislike")}
          >
            <ThumbsDown
              size={14}
              className={cn(userReaction === "dislike" && "fill-primary text-primary")}
            />
            <span>{dislikeCount}</span>
          </Button>
        </div>
      )}
    </div>
  )
}
