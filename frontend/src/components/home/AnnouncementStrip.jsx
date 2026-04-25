import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

const DISMISSED_KEY_PREFIX = "arooth-announcements-dismissed"

/**
 * Section 4 — Announcement strip. Dismissible, won't show again after close.
 */
export function AnnouncementStrip({ target = "all", queryKey = "default" }) {
  const { t } = useTranslation()
  const dismissedStorageKey = `${DISMISSED_KEY_PREFIX}-${queryKey}`
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const raw = localStorage.getItem(dismissedStorageKey)
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch {
      return new Set()
    }
  })

  const { data } = useQuery({
    queryKey: ["announcements", target],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/announcements", {
        params: { target },
      })
      return res?.data ?? []
    },
  })

  const allAnnouncements = useMemo(
    () => (data ?? []).filter((a) => a.active !== false && a.is_active !== false),
    [data]
  )
  const announcements = allAnnouncements.filter((a) => !dismissedIds.has(String(a.id)))

  const handleDismissAll = () => {
    const ids = new Set(allAnnouncements.map((a) => String(a.id)))
    setDismissedIds(ids)
    try {
      localStorage.setItem(dismissedStorageKey, JSON.stringify([...ids]))
    } catch {
      // Ignore storage failures (private mode, quota).
    }
  }

  if (announcements.length === 0) return null

  const displayText =
    announcements.length > 0
      ? announcements.map((a) => `${a.title}${a.message ? ` — ${a.message}` : ""}`).join(" · ")
      : t("announcements.default", "شريط إعلانات المنصة")

  return (
    <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-4 py-2.5 min-h-[40px] sm:px-6">
      <p className="flex-1 min-w-0 text-sm text-muted-foreground truncate">
        {displayText}
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 size-8 text-muted-foreground hover:text-foreground"
        onClick={handleDismissAll}
        aria-label={t("common.close", "إغلاق")}
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}
