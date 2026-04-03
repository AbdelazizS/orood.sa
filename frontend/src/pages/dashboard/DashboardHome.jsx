import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useDashboardHome } from "@/hooks/useDashboardHome"
import { DashboardHomeSkeleton } from "@/components/dashboard/DashboardHomeSkeleton"
import { ChargeBalanceModal } from "@/components/dashboard/ChargeBalanceModal"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/imageUrl"
import {
  getGreetingKey,
  formatRelativeTime,
  getStatusKey,
  getStatusVariant,
  getNotificationIcon,
  getNotificationIconBg,
} from "@/lib/dashboardUtils"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { useAppDirection } from "@/providers/DirectionProvider"
import { toast } from "sonner"
import {
  List,
  Package,
  Eye,
  Wallet,
  MessageCircle,
  CheckCircle,
  Gavel,
  Shield,
  ShieldCheck,
  Plus,
  ExternalLink,
  ChevronRight,
  ArrowUp,
  Pencil,
  ArrowDownToLine,
  Bell,
  ImageIcon,
  ShoppingBag,
} from "lucide-react"

function getStatsCardsConfig(stats, user, t) {
  const h = stats?.listings?.hidden ?? 0
  const w = stats?.views?.thisWeek ?? 0
  return [
    {
      labelKey: "dashboard.home.activeListings",
      value: stats?.listings?.active ?? 0,
      icon: <List size={18} />,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
      link: "/dashboard/listings",
      badge: h > 0 ? t("dashboard.home.hiddenCount", { count: h }) : null,
      badgeVariant: "secondary",
    },
    {
      labelKey: "dashboard.home.pendingOrders",
      value: stats?.orders?.pending ?? 0,
      icon: <Package size={18} />,
      iconBg: (stats?.orders?.pending ?? 0) > 0 ? "bg-destructive/10" : "bg-orange-500/10",
      iconColor: (stats?.orders?.pending ?? 0) > 0 ? "text-destructive" : "text-orange-600",
      link: "/dashboard/orders",
      urgent: (stats?.orders?.pending ?? 0) > 0,
    },
    {
      labelKey: "dashboard.home.viewsToday",
      value: stats?.views?.today ?? 0,
      icon: <Eye size={18} />,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      link: "/dashboard/listings",
      badge: t("dashboard.home.viewsThisWeek", { count: w }),
      badgeVariant: "outline",
    },
    {
      labelKey: "dashboard.home.withdrawableBalance",
      value: `${Number(stats?.wallet?.withdrawableBalance ?? 0).toFixed(0)}`,
      suffix: "common.currency",
      icon: <Wallet size={18} />,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-600",
      link: "/dashboard/balance",
    },
    {
      labelKey: "dashboard.home.unreadMessages",
      value: stats?.messages?.unread ?? 0,
      icon: <MessageCircle size={18} />,
      iconBg: (stats?.messages?.unread ?? 0) > 0 ? "bg-primary/10" : "bg-muted",
      iconColor: (stats?.messages?.unread ?? 0) > 0 ? "text-primary" : "text-muted-foreground",
      link: "/dashboard/messages",
      urgent: (stats?.messages?.unread ?? 0) > 0,
    },
    {
      labelKey: "dashboard.home.completedOrders",
      value: stats?.orders?.completed ?? 0,
      icon: <CheckCircle size={18} />,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-600",
      link: "/dashboard/orders",
    },
    {
      labelKey: "dashboard.home.pendingBids",
      value: stats?.bids?.pending ?? 0,
      icon: <Gavel size={18} />,
      iconBg: (stats?.bids?.pending ?? 0) > 0 ? "bg-orange-500/10" : "bg-muted",
      iconColor: (stats?.bids?.pending ?? 0) > 0 ? "text-orange-600" : "text-muted-foreground",
      link: "/dashboard/listings",
      urgent: (stats?.bids?.pending ?? 0) > 0,
    },
    {
      labelKey: "dashboard.home.escrowBalance",
      value: `${Number(stats?.wallet?.escrowBalance ?? 0).toFixed(0)}`,
      suffix: "common.currency",
      icon: <Shield size={18} />,
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-600",
      link: "/dashboard/balance",
    },
  ]
}

export function DashboardHome() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { direction } = useAppDirection()
  const queryClient = useQueryClient()
  const { user: authUser } = useAuthStore()
  const [showChargeModal, setShowChargeModal] = useState(false)

  const { data, isLoading } = useDashboardHome()
  const user = data?.user ?? authUser
  const stats = data?.stats ?? {}
  const recentOrders = data?.recentOrders ?? []
  const recentNotifications = data?.recentNotifications ?? []
  const recentListings = data?.recentListings ?? []

  const username = user?.username ?? user?.name ?? user?.id ?? ""
  const locale = i18n.language === "ar" ? "ar" : "en"

  const bumpMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/products/${id}/bump`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
      queryClient.invalidateQueries({ queryKey: ["products", "mine"] })
      toast.success(t("dashboard.home.bumpSuccess"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const markReadMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const alerts = []
  if ((stats?.orders?.pending ?? 0) > 0) {
    alerts.push({ type: "urgent", messageKey: "dashboard.home.alertPendingOrders", count: stats.orders.pending, link: "/dashboard/orders" })
  }
  if ((stats?.bids?.pending ?? 0) > 0) {
    alerts.push({ type: "urgent", messageKey: "dashboard.home.alertPendingBids", count: stats.bids.pending, link: "/dashboard/listings" })
  }
  if (!user?.isVerified) {
    alerts.push({ type: "info", messageKey: "dashboard.home.alertVerifyAccount", link: "/dashboard/verification" })
  }
  if ((stats?.messages?.unread ?? 0) > 0) {
    alerts.push({ type: "info", messageKey: "dashboard.home.alertUnreadMessages", count: stats.messages.unread, link: "/dashboard/messages" })
  }
  const displayAlerts = alerts.slice(0, 2)

  const statsCards = getStatsCardsConfig(stats, user, t)
  const profileLink = user?.username ? `/profile/${user.username}` : "/"

  const dateLocale = locale === "ar" ? "ar-SA" : "en-US"

  if (isLoading) {
    return <DashboardHomeSkeleton />
  }

  return (
    <div className="space-y-6" dir={direction}>
      {/* 1. Welcome header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-xl font-bold text-foreground">
            {t("dashboard.home.greeting", { name: username })}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t(getGreetingKey())} —{" "}
            {new Intl.DateTimeFormat(dateLocale, {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date())}
          </p>
        </div>
        <div className="shrink-0 lg:hidden">
          <NotificationBell />
        </div>
      </div>

      {/* 2. Urgent alerts banner */}
      {displayAlerts.length > 0 && (
        <div className="space-y-2">
          {displayAlerts.map((alert, i) => (
            <div
              key={i}
              onClick={() => navigate(alert.link)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg",
                "cursor-pointer hover:opacity-90 transition-opacity",
                "border",
                alert.type === "urgent"
                  ? "bg-destructive/5 border-destructive/20"
                  : "bg-primary/5 border-primary/20"
              )}
            >
              <ChevronRight
                size={16}
                className={cn("rtl-rotate shrink-0", alert.type === "urgent" ? "text-destructive" : "text-primary")}
              />
              <p
                className={cn(
                  "text-sm font-medium flex-1 text-start",
                  alert.type === "urgent" ? "text-destructive" : "text-primary"
                )}
              >
                {alert.count != null ? t(alert.messageKey, { count: alert.count }) : t(alert.messageKey)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 3. Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsCards.map((card) => (
          <Card
            key={card.labelKey}
            onClick={() => navigate(card.link)}
            className={cn(
              "cursor-pointer hover:border-primary/40 transition-all",
              "hover:shadow-sm group",
              card.urgent && "border-destructive/30"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div
                  className={cn(
                    "p-2 rounded-lg shrink-0 transition-colors",
                    card.iconBg,
                    "group-hover:opacity-80"
                  )}
                >
                  <span className={card.iconColor}>{card.icon}</span>
                </div>
                <div className="min-w-0 flex-1 text-start">
                  <p
                    className={cn(
                      "text-2xl font-bold leading-none",
                      card.urgent ? "text-destructive" : "text-foreground"
                    )}
                  >
                    {card.value}
                    {card.suffix ? ` ${t(card.suffix)}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{t(card.labelKey)}</p>
                  {card.badge && (
                    <Badge variant={card.badgeVariant} className="text-xs mt-1 h-4 px-1">
                      {card.badge}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 4. Quick actions */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => navigate("/add-listing")} className="gap-1.5">
          <Plus size={14} /> {t("dashboard.home.addNewListing")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowChargeModal(true)}
          className="gap-1.5"
        >
          <Wallet size={14} /> {t("dashboard.home.chargeBalance")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(profileLink)}
          className="gap-1.5"
        >
          <ExternalLink size={14} /> {t("dashboard.home.viewMyPage")}
        </Button>
        {!user?.isVerified && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard/verification")}
            className="gap-1.5 border-orange-300 text-orange-600"
          >
            <ShieldCheck size={14} /> {t("dashboard.home.verifyAccount")}
          </Button>
        )}
      </div>

      {/* 5. Two-column: Recent Orders + Wallet */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-xs gap-1"
              onClick={() => navigate("/dashboard/orders")}
            >
              {t("dashboard.viewAll")} <ChevronRight size={13} className="rtl-rotate" />
            </Button>
            <CardTitle className="text-base">{t("dashboard.home.recentOrders")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package size={32} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{t("dashboard.home.noOrders")}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-primary"
                  onClick={() => navigate("/add-listing")}
                >
                  {t("dashboard.home.addFirstListing")}
                </Button>
              </div>
            ) : (
              <div className="space-y-0">
                {recentOrders.map((order, i) => (
                  <div key={order.id}>
                    <div
                      onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                      className="flex items-center gap-3 py-3 cursor-pointer hover:bg-accent/50 rounded-md px-2 -mx-2 transition-colors"
                    >
                      <div className="h-10 w-12 rounded-md overflow-hidden border border-border shrink-0">
                        {order.listing?.images?.[0]?.url ? (
                          <img
                            src={resolveImageUrl(order.listing.images[0].url)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-muted flex items-center justify-center">
                            <Package size={14} className="text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-start">
                        <p className="text-sm font-medium truncate">
                          {order.listing?.title ?? "—"}
                        </p>
                        <div className="flex items-center justify-end gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(order.created_at ?? order.createdAt, locale)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {order.buyerId === user?.id
                              ? `${t("dashboard.home.seller")}: ${order.seller?.username ?? order.seller?.name ?? "—"}`
                              : `${t("dashboard.home.buyer")}: ${order.buyer?.username ?? order.buyer?.name ?? "—"}`}
                          </span>
                        </div>
                      </div>
                      <div className="text-end shrink-0">
                        <p className="text-sm font-bold text-foreground">
                          {Number(order.total ?? order.amount ?? 0).toFixed(0)} {t("common.currency")}
                        </p>
                        <Badge
                          variant={getStatusVariant(order.status)}
                          className={cn(
                            "text-xs h-4 px-1.5 mt-1",
                            order.status === "completed" && "text-green-600"
                          )}
                        >
                          {t(getStatusKey(order.status), order.status)}
                        </Badge>
                      </div>
                    </div>
                    {i < recentOrders.length - 1 && <Separator className="opacity-50" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-xs gap-1"
              onClick={() => navigate("/dashboard/balance")}
            >
              {t("dashboard.home.manage")} <ChevronRight size={13} className="rtl-rotate" />
            </Button>
            <CardTitle className="text-base">{t("dashboard.home.wallet")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 text-start">
              <p className="text-xs text-muted-foreground">{t("dashboard.home.totalBalance")}</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {Number(stats?.wallet?.balance ?? 0).toFixed(2)} {t("common.currency")}
              </p>
              <p className="text-xs text-primary mt-1">
                {t("dashboard.home.withdrawable")}: {Number(stats?.wallet?.withdrawableBalance ?? 0).toFixed(2)} {t("common.currency")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-border rounded-lg p-3 text-start">
                <p className="text-xs text-muted-foreground">{t("dashboard.home.escrow")}</p>
                <p className="text-lg font-bold text-orange-600 mt-0.5">
                  {Number(stats?.wallet?.escrowBalance ?? 0).toFixed(0)} {t("common.currency")}
                </p>
              </div>
              <div className="border border-border rounded-lg p-3 text-start">
                <p className="text-xs text-muted-foreground">{t("dashboard.home.financialGuarantee")}</p>
                <p className="text-lg font-bold text-primary mt-0.5">
                  {Number(stats?.wallet?.financialGuarantee ?? 0).toFixed(0)} {t("common.currency")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => navigate("/dashboard/balance")}
              >
                <ArrowDownToLine size={13} /> {t("dashboard.home.withdraw")}
              </Button>
              <Button size="sm" className="gap-1 text-xs" onClick={() => setShowChargeModal(true)}>
                <Plus size={13} /> {t("dashboard.home.chargeBalance")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 6. Recent listings */}
      {recentListings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-xs gap-1"
              onClick={() => navigate("/dashboard/listings")}
            >
              {t("dashboard.viewAll")} <ChevronRight size={13} className="rtl-rotate" />
            </Button>
            <h2 className="text-base font-semibold text-start">{t("dashboard.home.myRecentListings")}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentListings.map((listing) => (
              <Card
                key={listing.id}
                className="overflow-hidden hover:border-primary/40 transition-all"
              >
                <div className="h-28 overflow-hidden border-b border-border bg-muted relative">
                  {listing.images?.[0]?.url ? (
                    <img
                      src={resolveImageUrl(listing.images[0].url)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={24} className="text-muted-foreground" />
                    </div>
                  )}
                  <Badge
                    className="absolute top-1.5 end-1.5 text-xs"
                    variant={
                      listing.status === "published"
                        ? "default"
                        : listing.status === "sold"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {listing.status === "published"
                      ? t("dashboard.home.active")
                      : listing.status === "sold"
                        ? t("dashboard.home.sold")
                        : t("dashboard.home.hidden")}
                  </Badge>
                </div>
                <CardContent className="p-3 text-start">
                  <p className="text-sm font-medium line-clamp-1">{listing.title}</p>
                  <p className="text-base font-bold text-primary mt-0.5">
                    {listing.price ? `${Number(listing.price).toFixed(0)} ${t("common.currency")}` : t("dashboard.home.noPrice")}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      {listing.viewCount ?? 0}
                      <Eye size={11} />
                    </span>
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      {listing.messageCount ?? 0}
                      <MessageCircle size={11} />
                    </span>
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      {listing.soldCount ?? 0}
                      <ShoppingBag size={11} />
                    </span>
                  </div>
                  <div className="mt-2 flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        bumpMutation.mutate(listing.id)
                      }}
                      disabled={bumpMutation.isPending}
                    >
                      <ArrowUp size={11} /> {t("dashboard.home.update")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/products/${listing.id}/edit`)
                      }}
                    >
                      <Pencil size={11} /> {t("dashboard.home.edit")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 7. Recent notifications */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary text-xs gap-1"
            onClick={() => navigate("/dashboard/notifications")}
          >
            {t("dashboard.viewAll")} <ChevronRight size={13} className="rtl-rotate" />
          </Button>
          <CardTitle className="text-base flex items-center gap-2">
            {t("dashboard.home.recentNotifications")}
            {(stats?.notifications?.unread ?? 0) > 0 && (
              <Badge className="ms-2 text-xs rounded-full">
                {stats.notifications.unread}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {recentNotifications.length === 0 ? (
            <div className="text-center py-6">
              <Bell size={28} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{t("dashboard.home.noNotifications")}</p>
            </div>
          ) : (
            <div className="space-y-0">
              {recentNotifications.map((n, i) => (
                <div key={n.id}>
                  <div
                    onClick={() => {
                      if (!n.isRead) markReadMutation.mutate(n.id)
                      if (n.link) navigate(n.link)
                    }}
                    className={cn(
                      "flex items-start gap-3 py-3 px-2 -mx-2",
                      "rounded-md cursor-pointer transition-colors",
                      "hover:bg-accent/50",
                      !n.isRead && "bg-primary/5"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 p-1.5 rounded-md shrink-0",
                        getNotificationIconBg(n.type)
                      )}
                    >
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0 text-start">
                      <p
                        className={cn(
                          "text-sm",
                          !n.isRead ? "font-semibold text-foreground" : "text-foreground"
                        )}
                      >
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {n.body}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRelativeTime(n.createdAt ?? n.created_at, locale)}
                      </p>
                    </div>
                    {!n.isRead && (
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    )}
                  </div>
                  {i < recentNotifications.length - 1 && (
                    <Separator className="opacity-40" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 8. Verification nudge */}
      {!user?.isVerified && (
        <div
          onClick={() => navigate("/dashboard/verification")}
          className={cn(
            "flex items-center gap-4 p-4 rounded-xl",
            "border-2 border-dashed border-orange-200",
            "bg-orange-50/50 dark:bg-orange-950/20",
            "cursor-pointer hover:border-orange-300 transition-colors"
          )}
        >
          <div className="text-start flex-1">
            <p className="font-bold text-base text-foreground">{t("dashboard.home.verifyNow")}</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {t("dashboard.home.verifyDesc")}
            </p>
            <Button size="sm" className="mt-2 gap-1">
              <ShieldCheck size={13} /> {t("dashboard.home.startVerification")}
            </Button>
          </div>
          <ShieldCheck size={52} className="text-orange-400 shrink-0 opacity-60" />
        </div>
      )}

      <ChargeBalanceModal open={showChargeModal} onOpenChange={setShowChargeModal} />
    </div>
  )
}
