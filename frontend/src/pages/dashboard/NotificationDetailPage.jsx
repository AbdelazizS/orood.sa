import { useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useAccountSectionBasePath } from "@/lib/accountSectionPaths"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, Loader2 } from "lucide-react"
import apiClient from "@/lib/apiClient"
import {
  formatNotificationTimestamp,
  getNotificationActionButtonVariant,
  getNotificationActions,
  getNotificationBody,
  getNotificationTitle,
  getViewRequestNotificationHint,
} from "@/lib/notificationDisplay"

/**
 * @param {{ notificationId: string | undefined, backHref: string }} props
 */
export function NotificationDetailInner({ notificationId, backHref }) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()

  const {
    data: notification,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["notifications", "detail", notificationId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/notifications/${notificationId}`)
      return data?.data ?? null
    },
    enabled: Boolean(notificationId),
  })

  const markReadMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })

  useEffect(() => {
    if (!notification?.id || notification.read_at) return
    markReadMutation.mutate(notification.id)
  }, [notification?.id, notification?.read_at])

  const relatedLink =
    notification?.data && typeof notification.data === "object" && notification.data.link
      ? String(notification.data.link)
      : null
  const notificationActions = notification ? getNotificationActions(notification) : []

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-1">
        <Link to={backHref}>
          <ChevronRight className="size-4 rtl:rotate-180" />
          {t("notifications.backToNotifications", "Back to notifications")}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("notifications.detailTitle", "Notification")}
        </h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="text-muted-foreground">
          {error?.response?.status === 404 || error?.response?.status === 403
            ? t("notifications.notFound", "This notification could not be found.")
            : t("notifications.loadError", "Could not load this notification.")}
        </p>
      ) : !notification ? (
        <p className="text-muted-foreground">{t("notifications.notFound", "This notification could not be found.")}</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{getNotificationTitle(notification, t)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(getNotificationBody(notification, t) || notification.body) && (
              <p className="text-muted-foreground">{getNotificationBody(notification, t) || notification.body}</p>
            )}
            {getViewRequestNotificationHint(notification, t, i18n.language) ? (
              <p className="text-sm text-foreground/90">{getViewRequestNotificationHint(notification, t, i18n.language)}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {formatNotificationTimestamp(notification.created_at, i18n.language)}
            </p>
            {notificationActions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {notificationActions.map((a, idx) => (
                  <Button
                    key={`action-${idx}`}
                    asChild
                    variant={getNotificationActionButtonVariant(a, idx)}
                    className="w-full sm:w-auto"
                  >
                    <Link to={a.href.startsWith("/") ? a.href : `/${a.href}`}>{t(a.i18n_label_key)}</Link>
                  </Button>
                ))}
              </div>
            ) : null}
            {relatedLink && notificationActions.length === 0 && (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to={relatedLink.startsWith("/") ? relatedLink : `/${relatedLink}`}>
                  {t("notifications.openRelated", "Open related page")}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function NotificationDetailPage() {
  const { notificationId } = useParams()
  const basePath = useAccountSectionBasePath()
  return (
    <NotificationDetailInner
      notificationId={notificationId}
      backHref={`${basePath}/notifications`}
    />
  )
}
