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
import { useQueryClient } from "@tanstack/react-query"
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
  Landmark,
  ListTodo,
  BarChart3,
  Wallet,
  FileText,
  Bell,
  ShoppingCart,
  Gavel,
  Mail,
  Megaphone,
  Eye,
  Flag,
  ArrowDownToLine,
  UserRound,
  KeyRound,
  SlidersHorizontal,
} from "lucide-react"
import { dashboardUserNavLinks } from "@/navigation/dashboardUserNavLinks"
import { publicProfilePath } from "@/lib/profileRoutes"

function adminLinkVisible(user, link) {
  if (link.to === "/admin/bids") {
    const role = String(user?.role ?? "")
    if (role !== "super_admin" && role !== "admin") return false
  }
  if (!link.permission) return true
  if (!user?.permissions?.length) return false
  if (user.permissions.includes("*")) return true
  return user.permissions.includes(link.permission)
}

function hasPermission(user, permission) {
  if (!permission) return true
  const perms = Array.isArray(user?.permissions) ? user.permissions : []
  return perms.includes("*") || perms.includes(permission)
}

function memberLinkVisible(_user, _link) {
  if (_link?.to === "/dashboard/wholesale") {
    return _user?.role === "company"
  }
  return true
}

const adminLinks = [
  { to: "/admin", labelKey: "admin.dashboardTitle", icon: LayoutDashboard },
  { to: "/admin/orders", labelKey: "admin.ordersTitle", icon: ShoppingCart, permission: "orders.view" },
  { to: "/admin/bids", labelKey: "admin.bidsTitle", icon: Gavel, permission: "bids.admin_view" },
  { to: "/admin/charges", labelKey: "admin.chargeRequests", icon: Wallet, permission: "finance.approve_charge" },
  { to: "/admin/withdrawals", labelKey: "admin.withdrawals", icon: ArrowDownToLine, permission: "finance.approve_withdrawal" },
  { to: "/admin/financial-guarantees", labelKey: "admin.financialGuaranteesTitle", icon: Landmark },
  { to: "/admin/guarantee-requests", labelKey: "admin.guaranteeRequestsTitle", icon: Shield, permission: "compliance.review_guarantee_requests" },
  { to: "/admin/products", labelKey: "admin.offersAndRequests", icon: Package },
  { to: "/admin/users", labelKey: "dashboard.users", icon: Users },
  { to: "/admin/companies", labelKey: "admin.companiesVerificationTitle", icon: Landmark },
  { to: "/admin/categories", labelKey: "dashboard.categories", icon: FolderTree },
  { to: "/admin/regions", labelKey: "admin.regions", icon: MapPin },
  { to: "/admin/tasks", labelKey: "admin.tasks", icon: ListTodo },
  { to: "/admin/contact-inquiries", labelKey: "admin.contactInquiries", icon: Mail },
  { to: "/admin/listing-reports", labelKey: "admin.listingReports", icon: Flag },
  { to: "/admin/profile-reports", labelKey: "admin.profileReports", icon: UserRound },
  { to: "/admin/announcements", labelKey: "admin.announcements", icon: Megaphone },
  { to: "/admin/messages", labelKey: "admin.messagesTitle", icon: MessageSquare },
  { to: "/admin/visitors", labelKey: "admin.visitorsTitle", icon: Eye },
  { to: "/admin/roles", labelKey: "admin.roles", icon: Shield, permission: "users.assign_roles" },
  { to: "/admin/settings", labelKey: "admin.settingsTitle", icon: SlidersHorizontal, permission: "settings.view" },
  { to: "/admin/analytics", labelKey: "analytics.title", icon: BarChart3 },
  { to: "/admin/verifications", labelKey: "admin.verifications", icon: Shield, permission: "compliance.review_document_verifications" },
  { to: "/admin/audit", labelKey: "dashboard.auditLogs", icon: FileText },
]

/**
 * Dashboard layout using shadcn Sidebar (dashboard-01 style).
 * Collapsible sidebar, responsive, follows shadcn blocks.
 */
export function DashboardLayout({ adminLinks: isAdmin = false, children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { user, token } = useAuthStore()
  const { direction } = useAppDirection()
  const { state } = useSidebar()
  const isRtl = direction === "rtl"
  const side = "left"
  const links = isAdmin ? adminLinks.filter((l) => adminLinkVisible(user, l)) : dashboardUserNavLinks.filter((l) => memberLinkVisible(user, l))
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
              to={publicProfilePath(user) ?? "/dashboard"}
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
                const href = link.to
                const isIndexRoute = href === "/admin" || href === "/dashboard"
                const isActive = isIndexRoute
                    ? location.pathname === href
                    : location.pathname === href || location.pathname.startsWith(`${href}/`)
                return (
                  <SidebarMenuItem key={link.labelKey}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={t(link.labelKey)}
                    >
                      <Link to={href}>
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
                  {hasPermission(user, "bids.admin_view") || user.role === "admin" || user.role === "super_admin" ? (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">{t("admin.dashboardTitle")}</Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard">{t("dashboard.overview")}</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      authService.performLogout({ navigate, replaceTo: "/", queryClient })
                    }}
                    className="text-destructive"
                  >
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
