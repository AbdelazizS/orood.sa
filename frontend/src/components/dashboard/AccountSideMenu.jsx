import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/useAuthStore"
import * as authService from "@/services/authService"
import { useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Package,
  Heart,
  Search,
  MessageSquare,
  Settings,
  Shield,
  BarChart3,
  Bell,
  LogOut,
} from "lucide-react"

export const sidebarLinks = [
  { to: "/dashboard", labelKey: "dashboard.overview", icon: LayoutDashboard },
  { to: "/dashboard/orders", labelKey: "dashboard.orderTracking", icon: Package },
  { to: "/dashboard/balance", labelKey: "dashboard.balance", icon: BarChart3 },
  { to: "/dashboard/profile", labelKey: "dashboard.personalData", icon: Settings },
  { to: "/dashboard/verification", labelKey: "dashboard.verification", icon: Shield },
  { to: "/dashboard/messages", labelKey: "dashboard.messages", icon: MessageSquare },
  { to: "/dashboard/notifications", labelKey: "dashboard.notifications", icon: Bell },
  { to: "/dashboard/listings", labelKey: "dashboard.listings", icon: Package },
  { to: "/dashboard/favorites", labelKey: "dashboard.favorites", icon: Heart },
  { to: "/dashboard/saved-searches", labelKey: "dashboard.savedSearches", icon: Search },
]

export function AccountSideMenu({ className, onNavClick }) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <div className="mb-4 px-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("dashboard.menu", "قائمة الحساب")}
        </h3>
      </div>
      
      <div className="space-y-1">
        {sidebarLinks.map((link) => {
          const isActive = link.to === "/dashboard"
            ? location.pathname === link.to
            : location.pathname === link.to || location.pathname.startsWith(link.to + "/")
            
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-muted",
                isActive ? "bg-primary/10 text-primary hover:bg-primary/15" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <link.icon className={cn("size-4", isActive ? "text-primary" : "text-muted-foreground")} />
              {t(link.labelKey)}
            </Link>
          )
        })}
      </div>

      <div className="mt-8 border-t border-border pt-4">
        <button
          onClick={() => {
            authService.logout()
            navigate("/", { replace: true })
            if (onNavClick) onNavClick()
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-all hover:bg-destructive/10"
        >
          <LogOut className="size-4" />
          {t("auth.logout", "تسجيل خروج")}
        </button>
      </div>
    </div>
  )
}
