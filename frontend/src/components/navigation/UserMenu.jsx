import { Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import { useNotificationsUnreadSummary } from "@/hooks/useNotificationsInbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuthStore } from "@/store/useAuthStore"
import { publicProfilePath } from "@/lib/profileRoutes"
import * as authService from "@/services/authService"
import {
  ChevronDown,
  LayoutDashboard,
  Shield,
  User,
  Bell,
  LogOut,
  Plus,
} from "lucide-react"

/**
 * UserMenu — profile dropdown (big-company style).
 * All items are links with consistent hover. Notifications links to full page.
 */
export function UserMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, token } = useAuthStore()
  const memberProfileHref = publicProfilePath(user) ?? "/dashboard"
  const { data: summary } = useNotificationsUnreadSummary()
  const unreadCount = summary?.unreadCount ?? 0
  const isAdmin = user && ["admin", "super_admin", "manager", "employee"].includes(user.role)

  const handleLogout = () => {
    authService.performLogout({ navigate, replaceTo: "/", queryClient })
  }

  if (!token || !user) return null

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 rounded-full px-2 py-1.5 pe-2 ps-2 hover:bg-accent"
          aria-label={t("nav.profileMenu", "Profile menu")}
        >
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
        <div className="flex items-center gap-2 px-2 py-2">
          <Avatar className="size-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/add" className="flex cursor-pointer items-center gap-2">
            <Plus className="size-4" />
            {t("nav.addListing")}
          </Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link to="/admin" className="flex cursor-pointer items-center gap-2">
              <Shield className="size-4" />
              {t("dashboard.admin")}
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link to="/dashboard" className="flex cursor-pointer items-center gap-2">
              <LayoutDashboard className="size-4" />
              {t("dashboard.overview")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to={memberProfileHref} className="flex cursor-pointer items-center gap-2">
            <User className="size-4" />
            {t("nav.profile", "Profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={isAdmin ? "/admin/notifications" : "/dashboard/messages?hub=notifications"} className="flex cursor-pointer items-center gap-2">
            <Bell className="size-4" />
            {t("notifications.title", "Notifications")}
            {unreadCount > 0 && (
              <span className="ms-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          {t("auth.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
