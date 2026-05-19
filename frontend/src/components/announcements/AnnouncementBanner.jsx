import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/apiClient"
import { cn } from "@/lib/utils"

const TYPE_STYLES = {
  info: "border-b border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-b border-amber-200 bg-amber-50 text-amber-950",
  alert: "border-b border-red-200 bg-red-50 text-red-950",
}

const TYPE_PRIORITY = { alert: 3, warning: 2, info: 1 }

/**
 * Haraj-style announcement ticker strip — thin scrolling marquee.
 * Uses the highest-severity active announcement for bar colors.
 */
export function AnnouncementBanner() {
  const { data } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/announcements")
      return res?.data ?? []
    },
  })

  const announcements = (data ?? []).filter((a) => a.active !== false && a.is_active !== false)

  const barType = useMemo(() => {
    if (announcements.length === 0) return "info"
    const sorted = [...announcements].sort(
      (a, b) => (TYPE_PRIORITY[b.type] ?? 0) - (TYPE_PRIORITY[a.type] ?? 0),
    )
    return sorted[0]?.type ?? "info"
  }, [announcements])

  const barClass = TYPE_STYLES[barType] ?? TYPE_STYLES.info

  const tickerContent =
    announcements.length > 0
      ? announcements.map((a) => (
          <span key={a.id} className="inline-block me-8">
            {a.title}
            {a.message ? ` — ${a.message}` : ""}
          </span>
        ))
      : [
          <span key="1" className="inline-block me-8">
            شريط - إعلانات المنصة
          </span>,
          <span key="2" className="inline-block me-8">
            ---- إعلانات المنصة ----
          </span>,
          <span key="3" className="inline-block me-8">
            تنويه
          </span>,
        ]

  return (
    <div className={cn("py-1.5 overflow-hidden", barClass)}>
      <div className="animate-marquee whitespace-nowrap text-xs inline-flex opacity-90">
        {tickerContent}
        {tickerContent}
      </div>
    </div>
  )
}
