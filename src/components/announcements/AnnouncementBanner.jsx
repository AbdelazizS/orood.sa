import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { useState } from "react"
import apiClient from "@/lib/apiClient"
import { Button } from "@/components/ui/button"

const TYPE_STYLES = {
  info: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  warning: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
  alert: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
}

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("announcements_dismissed") ?? "[]")
    } catch {
      return []
    }
  })

  const { data } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/announcements")
      return res?.data ?? []
    },
  })

  const announcements = (data ?? []).filter((a) => !dismissed.includes(a.id))

  const handleDismiss = (id) => {
    const next = [...dismissed, id]
    setDismissed(next)
    try {
      localStorage.setItem("announcements_dismissed", JSON.stringify(next))
    } catch {}
  }

  if (announcements.length === 0) return null

  return (
    <div className="space-y-1">
      {announcements.map((a) => (
        <div
          key={a.id}
          className={`flex items-center justify-between gap-4 border-b px-4 py-2.5 text-sm ${TYPE_STYLES[a.type] ?? TYPE_STYLES.info}`}
        >
          <div className="min-w-0 flex-1">
            <span className="font-semibold">{a.title}</span>
            {a.message && (
              <span className="ms-2 text-muted-foreground">{a.message}</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 size-7"
            onClick={() => handleDismiss(a.id)}
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
