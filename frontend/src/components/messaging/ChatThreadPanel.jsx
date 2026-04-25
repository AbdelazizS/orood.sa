import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

/**
 * Scrollable message list. Pass `anchorKey` derived only from message data (e.g. last id + count)
 * so typing in the composer does not re-trigger auto-scroll.
 */
export function ChatThreadPanel({ children, className, anchorKey = "" }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const id = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
    return () => cancelAnimationFrame(id)
  }, [anchorKey])

  return (
    <div
      ref={scrollRef}
      className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-2 sm:px-3", className)}
    >
      <div className="space-y-2">{children}</div>
    </div>
  )
}
