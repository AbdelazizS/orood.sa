import { cn } from "@/lib/utils"

export function MessageBubble({
  body,
  isOwn = false,
  senderName,
  timestamp,
  showSender = false,
  className,
}) {
  return (
    <div className={cn("flex w-full", isOwn ? "justify-end" : "justify-start", className)}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[78%]",
          isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
        )}
      >
        {showSender && senderName ? (
          <p className={cn("mb-0.5 text-[11px] font-semibold", isOwn ? "text-primary-foreground/80" : "text-muted-foreground")}>
            {senderName}
          </p>
        ) : null}
        <p className="whitespace-pre-wrap break-words leading-relaxed">{body}</p>
        {timestamp ? (
          <p className={cn("mt-1 text-[10px]", isOwn ? "text-primary-foreground/80" : "text-muted-foreground")}>
            {timestamp}
          </p>
        ) : null}
      </div>
    </div>
  )
}
