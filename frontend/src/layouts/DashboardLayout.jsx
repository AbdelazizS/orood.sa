import { Link, useLocation, useNavigate, Outlet } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/navigation/ThemeToggle"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { MessageIcon } from "@/components/messages/MessageIcon"
import { useAuthStore } from "@/store/useAuthStore"
import { useSidebar } from "@/components/ui/sidebar"
import * as authService from "@/services/authService"
import {
  LayoutDashboard,
  Package,
  Heart,
  Search,
  MessageSquare,
  FolderTree,
  Users,
  Settings,
  ChevronDown,
  Home,
  LogOut,
  MapPin,
  Shield,
  ListTodo,
  BarChart3,
  FileText,
  Bell,
  ShoppingCart,
  Mail,
  Megaphone,
  Eye,
} from "lucide-react"

const sidebarLinks = [
  { to: "/dashboard", labelKey: "dashboard.overview", icon: LayoutDashboard },
  { to: "/dashboard/orders", labelKey: "dashboard.orderTracking", icon: Package },
  { to: "/dashboard/balance", labelKey: "dashboard.balance", icon: BarChart3 },
  { to: "/dashboard/balance", labelKey: "dashboard.financialGuarantee", icon: Shield },
  { to: "/dashboard/profile", labelKey: "dashboard.personalData", icon: Settings },
  { to: "/dashboard/verification", labelKey: "dashboard.verification", icon: Shield },
  { to: "/dashboard/messages", labelKey: "dashboard.messages", icon: MessageSquare },
  { to: "/dashboard/notifications", labelKey: "dashboard.notifications", icon: Bell },
  { to: "/dashboard/listings", labelKey: "dashboard.listings", icon: Package },
  { to: "/dashboard/favorites", labelKey: "dashboard.favorites", icon: Heart },
  { to: "/dashboard/saved-searches", labelKey: "dashboard.savedSearches", icon: Search },
]

const adminLinks = [
  { to: "/admin", labelKey: "admin.dashboardTitle", icon: LayoutDashboard },
  { to: "/admin/orders", labelKey: "admin.ordersTitle", icon: ShoppingCart },
  { to: "/admin/products", labelKey: "admin.offersAndRequests", icon: Package },
  { to: "/admin/users", labelKey: "dashboard.users", icon: Users },
  { to: "/admin/categories", labelKey: "dashboard.categories", icon: FolderTree },
  { to: "/admin/regions", labelKey: "admin.regions", icon: MapPin },
  { to: "/admin/tasks", labelKey: "admin.tasks", icon: ListTodo },
  { to: "/admin/contact-inquiries", labelKey: "admin.contactInquiries", icon: Mail },
  { to: "/admin/announcements", labelKey: "admin.announcements", icon: Megaphone },
  { to: "/admin/messages", labelKey: "admin.messagesTitle", icon: MessageSquare },
  { to: "/admin/visitors", labelKey: "admin.visitorsTitle", icon: Eye },
  { to: "/admin/roles", labelKey: "admin.roles", icon: Shield },
  { to: "/admin/analytics", labelKey: "analytics.title", icon: BarChart3 },
  { to: "/admin/verifications", labelKey: "admin.verifications", icon: Shield },
  { to: "/admin/audit", labelKey: "dashboard.auditLogs", icon: FileText },
]

/**
 * Dashboard layout using shadcn Sidebar (dashboard-01 style).
 * Collapsible sidebar, responsive, follows shadcn blocks.
 */
export function DashboardLayout({ adminLinks: isAdmin = false, children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, token } = useAuthStore()
  const { direction } = useAppDirection()
  const { state } = useSidebar()
  const isRtl = direction === "rtl"
  const side = "left"
  const links = isAdmin ? adminLinks : sidebarLinks
  const isCollapsed = state === "collapsed"

  return (
    <>
      <Sidebar side={side} collapsible="icon">
        <SidebarHeader className="border-b p-2 sm:p-3" dir={direction}>
          <Link
            to={isAdmin ? "/admin" : "/dashboard"}
            className="flex items-center gap-2 font-semibold overflow-hidden min-w-0"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
              {t("common.brandName").charAt(0)}
            </span>
            <span className={cn("truncate transition-opacity text-sm", isCollapsed && "w-0 opacity-0")}>
              {t("common.brandName")}
            </span>
          </Link>
          {!isAdmin && user && (
            <Link
              to={`/users/${user.id}`}
              className={cn(
                "mt-3 flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-accent transition-colors overflow-hidden",
                isCollapsed && "justify-center"
              )}
            >
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="text-xs">{user.name?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
              <span className={cn("truncate text-sm font-medium", isCollapsed && "w-0 opacity-0")}>
                {user.name}
              </span>
            </Link>
          )}
        </SidebarHeader>
        <SidebarContent dir={direction}>
          <SidebarGroup>
            <SidebarGroupLabel>{isAdmin ? t("dashboard.admin", "Admin") : t("dashboard.menu", "Menu")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {links.map((link) => {
                const isIndexRoute = link.to === "/admin" || link.to === "/dashboard"
                const isActive = isIndexRoute
                  ? location.pathname === link.to
                  : (location.pathname === link.to || location.pathname.startsWith(link.to + "/"))
                return (
                  <SidebarMenuItem key={link.labelKey}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={t(link.labelKey)}
                    >
                      <Link to={link.to}>
                        <link.icon className="size-4" />
                        <span>{t(link.labelKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset dir={direction}>
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <SidebarTrigger className={isRtl ? "-me-2" : "-ms-2"} />
            <Link to="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Home className="size-4" />
              {t("dashboard.backToSite", "Back to site")}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {token && user && (
              <>
                <MessageIcon />
                <NotificationBell />
              </>
            )}
            <ThemeToggle />
            <LanguageSwitcher />
            {token && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">{user.name?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-24 truncate sm:inline">{user.name}</span>
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-48">
                  {(user.role === "admin" || user.role === "super_admin" || user.role === "manager" || user.role === "employee") ? (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">{t("admin.dashboardTitle")}</Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard">{t("dashboard.overview")}</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { authService.logout(); navigate("/", { replace: true }) }} className="text-destructive">
                    <LogOut className="me-2 size-4" />
                    {t("auth.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        <div className="flex flex-1 flex-col p-4 md:p-6">
          {children ?? <Outlet />}
        </div>
      </SidebarInset>
    </>
  )
}
