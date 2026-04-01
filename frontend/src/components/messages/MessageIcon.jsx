import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import apiClient from "@/lib/apiClient"

/**
 * MessageIcon — header icon linking to Messages (Mostaql-style).
 * Shows unread count badge when available.
 */
export function MessageIcon() {
  const { t } = useTranslation()

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await apiClient.get("/conversations")
      return data?.data ?? []
    },
    retry: false,
  })

  const unreadCount = conversations.reduce((acc, c) => acc + (c.unread_count ?? 0), 0)

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link to="/dashboard/messages" title={t("dashboard.messages", "Messages")}>
        <MessageSquare className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  )
}
