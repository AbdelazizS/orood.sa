import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import apiClient from "@/lib/apiClient"
import {
  formatNotificationTimestamp,
  getNotificationActions,
  getNotificationBody,
  getNotificationTitle,
} from "@/lib/notificationDisplay"
import { useNotificationsInbox } from "@/hooks/useNotificationsInbox"
import { useAccountSectionBasePath } from "@/lib/accountSectionPaths"
import { Bell, Loader2 } from "lucide-react"

export function NotificationsPage() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const basePath = useAccountSectionBasePath()

  const { data: inbox, isLoading } = useNotificationsInbox(50)
  const notifications = inbox?.items ?? []

  const markReadMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.post("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const unreadCount = Number(inbox?.meta?.unread_count ?? 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("notifications.title", "Notifications")}</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? t("notifications.unreadCount", "{{count}} unread", { count: unreadCount })
              : t("notifications.allRead", "All caught up")}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              t("notifications.markAllRead", "Mark all read")
            )}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4" />
            {t("notifications.recent", "Recent")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {t("notifications.empty", "No notifications")}
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-0 divide-y">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/50 ${!n.read_at ? "bg-muted/30" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`${basePath}/notifications/${n.id}`}
                        className="block rounded-md text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <p className="font-medium hover:underline">{getNotificationTitle(n, t)}</p>
                        {(getNotificationBody(n, t) || n.body) && (
                          <p className="mt-0.5 text-sm text-muted-foreground">{getNotificationBody(n, t) || n.body}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatNotificationTimestamp(n.created_at, i18n.language)}
                        </p>
                      </Link>
                      {getNotificationActions(n).length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {getNotificationActions(n).map((a, idx) => (
                            <Button key={`${n.id}-a-${idx}`} variant="secondary" size="sm" asChild>
                              <Link to={a.href.startsWith("/") ? a.href : `/${a.href}`}>{t(a.i18n_label_key)}</Link>
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {!n.read_at && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
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
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
