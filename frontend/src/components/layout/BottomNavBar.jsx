import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Bell, Home, Mail, Package, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppDirection } from "@/providers/DirectionProvider"
import { useAuthStore } from "@/store/useAuthStore"
import { isStaffUser } from "@/lib/accountSectionPaths"

/**
 * Fixed mobile bottom bar (hidden on lg+), shown to everyone — visitors are sent to login by the
 * protected pages. Order (RTL): الرئيسية · تتبع الطلبات · إضافة عرض · الإشعارات · الرسائل.
 */
export function BottomNavBar() {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const staff = isStaffUser(user)
  const path = location.pathname
  const search = location.search

  const ordersPath = staff ? "/admin/orders" : "/dashboard/orders"
  const notificationsPath = staff ? "/admin/notifications" : "/dashboard/messages?hub=notifications"
  const inboxPath = staff ? "/admin/messages" : "/dashboard/messages"

  const isNotifications = staff
    ? path.startsWith("/admin/notifications")
    : path.startsWith("/dashboard/messages") && search.includes("hub=notifications")
  const items = [
    { key: "home", to: "/", icon: Home, label: t("nav.home", "الرئيسية"), active: path === "/" },
    { key: "orders", to: ordersPath, icon: Package, label: t("nav.trackOrders", "تتبع الطلبات"), active: path.startsWith(ordersPath) },
    { key: "add" },
    { key: "notifications", to: notificationsPath, icon: Bell, label: t("nav.notifications", "الإشعارات"), active: isNotifications },
    {
      key: "inbox",
      to: inboxPath,
      icon: Mail,
      label: t("nav.messages", "الرسائل"),
      active: staff ? path.startsWith("/admin/messages") : path.startsWith("/dashboard/messages") && !isNotifications,
    },
  ]

  return (
    <nav
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden"
      dir={direction}
      aria-label={t("nav.mobileBar", "التنقل السريع")}
    >
      <div
        className="mx-auto flex w-full max-w-lg items-end justify-around px-1"
        style={{ minHeight: "60px", paddingBottom: "env(safe-area-inset-bottom, 0)" }}
      >
        {items.map((item) => {
          if (item.key === "add") {
            const active = path === "/add"
            return (
              <Link key="add" to="/add" className="-mt-5 flex min-w-0 flex-1 flex-col items-center justify-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform active:scale-95">
                  <Plus className="size-7" strokeWidth={2.5} aria-hidden />
                </span>
                <span className={cn("mt-1 max-w-full truncate text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                  {t("nav.addOffer", "إضافة عرض")}
                </span>
              </Link>
            )
          }
          const Icon = item.icon
          return (
            <Link
              key={item.key}
              to={item.to}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 pb-1.5 pt-2 transition-colors",
                item.active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-6 shrink-0" aria-hidden />
              <span className={cn("max-w-full truncate text-[11px]", item.active && "font-medium")}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
