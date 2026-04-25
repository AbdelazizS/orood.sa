import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Home, Plus, Bell, Mail, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppDirection } from "@/providers/DirectionProvider"
import { useAuthStore } from "@/store/useAuthStore"
import { isStaffUser } from "@/lib/accountSectionPaths"

/**
 * Fixed bottom nav bar — visible when authenticated, hidden on lg+.
 * Uses shadcn primary colors.
 */
export function BottomNavBar() {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const staff = isStaffUser(user)
  const notifPath = staff ? "/admin/notifications" : "/dashboard/notifications"
  const msgPath = staff ? "/admin/messages" : "/dashboard/messages"
  const isAddPage = location.pathname === "/add"
  const isHome = location.pathname === "/"
  const isNotifications = staff
    ? location.pathname.startsWith("/admin/notifications")
    : location.pathname.startsWith("/dashboard/notifications")
  const isMessages = staff
    ? location.pathname.startsWith("/admin/messages")
    : location.pathname.startsWith("/dashboard/messages")
  const isOrders = location.pathname.startsWith("/dashboard/orders")

  const linkClass = "flex flex-1 flex-col items-center justify-center gap-0.5 pt-2 transition-colors"
  const activeClass = "text-primary"
  const inactiveClass = "text-muted-foreground"

  return (
    <nav
      className="fixed bottom-0 start-0 end-0 z-[9999] flex items-end justify-center border-t border-border bg-background lg:hidden"
      dir={direction}
    >
      <div
        className="flex w-full items-end justify-around px-2"
        style={{ minHeight: "60px", paddingBottom: "env(safe-area-inset-bottom, 0)" }}
      >
        <Link
          to="/"
          className={cn(linkClass, isHome ? activeClass : inactiveClass)}
        >
          <Home className="size-6" />
          <span className={cn("text-[11px]", isHome ? "text-primary font-medium" : "text-muted-foreground")}>
            {t("nav.home", "الرئيسية")}
          </span>
        </Link>

        <Link
          to="/dashboard/orders"
          className={cn(linkClass, isOrders ? activeClass : inactiveClass)}
        >
          <Package className="size-6" />
          <span className={cn("text-[11px]", isOrders ? "text-primary font-medium" : "text-muted-foreground")}>
            {t("dashboard.orderTracking", "الطلبات")}
          </span>
        </Link>

        <Link to="/add" className="flex flex-col items-center justify-center -mt-5">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-95">
            <Plus className="size-7" strokeWidth={2.5} />
          </div>
          <span className={cn("mt-1 text-[11px] font-medium", isAddPage ? "text-primary" : "text-muted-foreground")}>
            {t("nav.addOffer", "إضافة عرض")}
          </span>
        </Link>

        <Link
          to={notifPath}
          className={cn(linkClass, isNotifications ? activeClass : inactiveClass)}
        >
          <Bell className="size-6" />
          <span className={cn("text-[11px]", isNotifications ? "text-primary font-medium" : "text-muted-foreground")}>
            {t("notifications.title", "الإشعارات")}
          </span>
        </Link>

        <Link
          to={msgPath}
          className={cn(linkClass, isMessages ? activeClass : inactiveClass)}
        >
          <Mail className="size-6" />
          <span className={cn("text-[11px]", isMessages ? "text-primary font-medium" : "text-muted-foreground")}>
            {t("dashboard.messages", "الرسائل")}
          </span>
        </Link>
      </div>
    </nav>
  )
}
