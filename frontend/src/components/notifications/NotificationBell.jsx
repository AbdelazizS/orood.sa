import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAccountSectionBasePath } from "@/lib/accountSectionPaths"
import { getNotificationBody, getNotificationTitle } from "@/lib/notificationDisplay"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import apiClient from "@/lib/apiClient"
import { useNotificationsInbox } from "@/hooks/useNotificationsInbox"

function NotificationBell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const basePath = useAccountSectionBasePath()

  const { data, isLoading } = useNotificationsInbox(15, { refetchInterval: 30_000 })

  const markReadMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.post("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const notifications = Array.isArray(data?.items) ? data.items : []
  const unreadCount = Number(data?.meta?.unread_count ?? 0)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-2">
          <span className="font-semibold">{t("notifications.title", "Notifications")}</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              {t("notifications.markAllRead", "Mark all read")}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[280px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              {t("notifications.empty", "No notifications")}
            </div>
          ) : (
            <div className="space-y-0">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start justify-between gap-2 border-b px-3 py-2.5 last:border-b-0 ${!n.read_at ? "bg-muted/50" : ""}`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 rounded-md text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => navigate(`${basePath}/notifications/${n.id}`)}
                  >
                    <span className="block text-sm font-medium hover:underline">{getNotificationTitle(n, t)}</span>
                    {(getNotificationBody(n, t) || n.body) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{getNotificationBody(n, t) || n.body}</p>
                    )}
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                    </span>
                  </button>
                  {!n.read_at && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        markReadMutation.mutate(n.id)
                      }}
                      disabled={markReadMutation.isPending}
                    >
                      {t("notifications.markRead", "Mark as read")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { NotificationBell }
