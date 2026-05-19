import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Home, Plus, Mail, Package, LayoutDashboard } from "lucide-react"
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
  const inboxPath = staff ? "/admin/messages" : "/dashboard/messages"
  const dashboardPath = staff ? "/admin" : "/dashboard"
  const ordersPath = staff ? "/admin/orders" : "/dashboard/orders"
  const isAddPage = location.pathname === "/add"
  const isHome = location.pathname === "/"
  const isDashboard =
    staff ? location.pathname === "/admin" : location.pathname === "/dashboard"
  const isInbox = staff
    ? location.pathname.startsWith("/admin/messages") || location.pathname.startsWith("/admin/notifications")
    : location.pathname.startsWith("/dashboard/messages")
  const isOrders = location.pathname.startsWith(ordersPath)

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
          className={cn(linkClass, "min-w-0 max-w-[22%] flex-1", isHome ? activeClass : inactiveClass)}
        >
          <Home className="size-6 shrink-0" />
          <span className={cn("max-w-full truncate text-[11px]", isHome ? "text-primary font-medium" : "text-muted-foreground")}>
            {t("nav.home", "الرئيسية")}
          </span>
        </Link>

        <Link
          to={dashboardPath}
          className={cn(linkClass, "min-w-0 max-w-[22%] flex-1", isDashboard ? activeClass : inactiveClass)}
        >
          <LayoutDashboard className="size-6 shrink-0" />
          <span
            className={cn(
              "max-w-full truncate text-[11px]",
              isDashboard ? "text-primary font-medium" : "text-muted-foreground",
            )}
          >
            {staff ? t("admin.dashboardTitle", "Admin") : t("dashboard.overview", "Overview")}
          </span>
        </Link>

        <Link to="/add" className="flex max-w-[22%] flex-1 flex-col items-center justify-center -mt-5 min-w-0">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-95">
            <Plus className="size-7" strokeWidth={2.5} />
          </div>
          <span className={cn("mt-1 max-w-full truncate text-[11px] font-medium", isAddPage ? "text-primary" : "text-muted-foreground")}>
            {t("nav.addOffer", "إضافة عرض")}
          </span>
        </Link>

        <Link
          to={ordersPath}
          className={cn(linkClass, "min-w-0 max-w-[22%] flex-1", isOrders ? activeClass : inactiveClass)}
        >
          <Package className="size-6 shrink-0" />
          <span className={cn("max-w-full truncate text-[11px]", isOrders ? "text-primary font-medium" : "text-muted-foreground")}>
            {t("dashboard.nav.orderCenter", "الطلبات")}
          </span>
        </Link>

        <Link
          to={inboxPath}
          className={cn(linkClass, "min-w-0 max-w-[22%] flex-1", isInbox ? activeClass : inactiveClass)}
        >
          <Mail className="size-6 shrink-0" />
          <span className={cn("max-w-full truncate text-[11px]", isInbox ? "text-primary font-medium" : "text-muted-foreground")}>
            {t("dashboard.nav.inbox", "المراسلة")}
          </span>
        </Link>
      </div>
    </nav>
  )
}
