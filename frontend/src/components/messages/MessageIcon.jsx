import { Link, useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import apiClient from "@/lib/apiClient"
import { isStaffUser } from "@/lib/accountSectionPaths"
import { useAuthStore } from "@/store/useAuthStore"

/**
 * MessageIcon — header icon linking to Messages (Mostaql-style).
 * Shows unread count badge when available (member inbox only).
 */
export function MessageIcon() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)
  const inAdminShell = pathname.startsWith("/admin")
  const staff = isStaffUser(user)
  const messagesHref = inAdminShell || staff ? "/admin/messages" : "/dashboard/messages"

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await apiClient.get("/conversations")
      return data?.data ?? []
    },
    retry: false,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    enabled: !staff,
  })

  const unreadCount = staff ? 0 : conversations.reduce((acc, c) => acc + (c.unread_count ?? 0), 0)

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link to={messagesHref} title={t("dashboard.messages", "Messages")}>
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
