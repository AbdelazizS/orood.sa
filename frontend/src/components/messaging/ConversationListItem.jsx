import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

function getInitial(name) {
  return (name?.trim()?.charAt(0) || "?").toUpperCase()
}

export function ConversationListItem({
  title,
  subtitle,
  preview,
  timeLabel,
  unreadCount = 0,
  isActive = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-start transition-colors",
        "hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        isActive && "bg-muted"
      )}
    >
      <Avatar className="size-10 shrink-0">
        <AvatarFallback>{getInitial(title)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title || "—"}</p>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        {preview ? <p className="truncate text-xs text-muted-foreground">{preview}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {timeLabel ? <span className="text-[11px] text-muted-foreground">{timeLabel}</span> : null}
        {unreadCount > 0 ? (
          <Badge className="h-5 min-w-5 rounded-full px-1.5 text-[10px] tabular-nums">{unreadCount > 99 ? "99+" : unreadCount}</Badge>
        ) : null}
      </div>
    </button>
  )
}
