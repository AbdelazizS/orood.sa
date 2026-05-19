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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { resolveImageUrl } from "@/lib/imageUrl"
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
  UserRound,
  KeyRound,
  SlidersHorizontal,
} from "lucide-react"
import { getMemberDashboardNavSections, isMemberNavItemActive } from "@/navigation/memberDashboardNav"
import { adminNavSections, isAdminNavItemActive } from "@/navigation/adminDashboardNav"
import { publicProfilePath } from "@/lib/profileRoutes"
import { AppLogo } from "@/components/common/AppLogo"
import { SeoHead } from "@/components/seo/SeoHead"

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
  const { state, isMobile } = useSidebar()
  const isRtl = direction === "rtl"
  const side = "left"
  const adminSections = isAdmin
    ? adminNavSections
        .map((section) => ({
          ...section,
          items: section.items.filter((l) => adminLinkVisible(user, l)),
        }))
        .filter((section) => section.items.length > 0)
    : []
  const memberSections = !isAdmin ? getMemberDashboardNavSections(user) : []
  const isCollapsed = state === "collapsed"

  const iconRailNavButtonClass = cn(
    "rounded-full text-sm transition-all data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-sm data-[active=true]:ring-1 data-[active=true]:ring-sidebar-border/60",
    isCollapsed && !isMobile
      ? "mx-auto !size-9 !min-h-9 !min-w-9 !shrink-0 !justify-center !gap-0 !p-0 [&>span:last-child]:hidden"
      : "h-11 min-h-11 px-4",
    isMobile && "min-h-12 w-full justify-start py-3 text-base px-4 [&>span:last-child]:inline",
  )

  const profileAvatar = (
    <Avatar className={cn("shrink-0", isCollapsed && !isMobile ? "size-8" : "size-9")}>
      {user?.avatar_url ? (
        <AvatarImage src={resolveImageUrl(user.avatar_url)} alt="" className="object-cover" />
      ) : null}
      <AvatarFallback className="text-xs font-medium">
        {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
      </AvatarFallback>
    </Avatar>
  )

  return (
    <>
      {!isAdmin ? <SeoHead path="/dashboard" noindex /> : null}
      <Sidebar side={side} collapsible="icon">
        <SidebarHeader className="border-b" dir={direction}>
          <Link
            to={isAdmin ? "/admin" : "/dashboard"}
            className={cn(
              "flex min-w-0 items-center transition-opacity hover:opacity-90",
              isCollapsed && !isMobile ? "mx-auto size-11 justify-center" : "justify-center px-2 py-2",
            )}
            title={t("common.brandName")}
          >
            <AppLogo
              placement="sidebar"
              variant="favicon"
              alt={t("common.brandName")}
            />
          </Link>
          {!isAdmin && user && (() => {
            const profileLink = (
              <Link
                to={publicProfilePath(user) ?? "/dashboard"}
                className={cn(
                  "flex min-w-0 items-center rounded-lg transition-colors hover:bg-sidebar-accent",
                  isCollapsed && !isMobile
                    ? "mx-auto size-9 justify-center p-0"
                    : "mt-3 gap-3 px-3 py-2.5",
                )}
              >
                {profileAvatar}
                {(!isCollapsed || isMobile) && (
                  <span className="truncate text-sm font-medium">{user.name}</span>
                )}
              </Link>
            )

            if (isCollapsed && !isMobile) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{profileLink}</TooltipTrigger>
                  <TooltipContent side={isRtl ? "left" : "right"} align="center">
                    {user.name}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return profileLink
          })()}
        </SidebarHeader>
        <SidebarContent
          dir={direction}
          className={cn(
            "gap-1 overflow-x-hidden py-2 md:py-3",
            isCollapsed && !isMobile ? "px-0" : "px-2",
            isMobile && "px-3 py-3",
          )}
        >
          {isAdmin ? (
            adminSections.map((section) => (
              <SidebarGroup
                key={section.id}
                className={cn("py-1.5 first:pt-1", isMobile && "px-0.5", isCollapsed && !isMobile && "px-0 py-1 first:pt-0.5")}
              >
                <SidebarGroupLabel
                  className={cn(
                    "px-3 py-0.5 mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70",
                    isMobile && "text-xs",
                  )}
                >
                  {t(section.labelKey, section.id)}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className={cn("gap-0.5", isCollapsed && !isMobile && "items-center")}>
                    {section.items.map((link) => {
                      const isActive = isAdminNavItemActive(link, location)
                      return (
                        <SidebarMenuItem key={link.to}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={t(link.labelKey)}
                            className={iconRailNavButtonClass}
                          >
                            <Link to={link.to}>
                              <link.icon className="size-4 shrink-0" />
                              <span>{t(link.labelKey)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))
          ) : (
            memberSections.map((section) => (
              <SidebarGroup
                key={section.id}
                className={cn(
                  "py-3 first:pt-2",
                  isMobile && "px-0.5",
                  isCollapsed && !isMobile && "px-0 py-2 first:pt-1",
                )}
              >
                <SidebarGroupLabel
                  className={cn(
                    "px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70",
                    isMobile && "text-xs",
                  )}
                >
                  {t(section.labelKey)}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className={cn("gap-0.5", isCollapsed && !isMobile && "items-center")}>
                    {section.items.map((link) => {
                      const isActive = isMemberNavItemActive(link, location)
                      return (
                        <SidebarMenuItem key={link.id}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={t(link.labelKey)}
                            className={iconRailNavButtonClass}
                          >
                            <Link to={link.to}>
                              <link.icon className="size-4 shrink-0" />
                              <span>{t(link.labelKey)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))
          )}
        </SidebarContent>
      </Sidebar>
      <SidebarInset dir={direction}>
        <header className="sticky top-0 z-10 flex min-h-14 shrink-0 items-center justify-between gap-1.5 border-b bg-background px-2 py-2 sm:min-h-16 sm:gap-2 sm:px-4 md:px-6 md:py-0">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
            <SidebarTrigger className={cn("shrink-0", isRtl ? "-me-1 sm:-me-2" : "-ms-1 sm:-ms-2")} />
            <Button
              variant="ghost"
              size={isMobile ? "icon" : "sm"}
              asChild
              className={cn(
                "shrink-0 text-muted-foreground hover:text-foreground",
                isMobile ? "size-9" : "min-h-10 gap-2 px-3",
              )}
              title={t("dashboard.backToSite", "Back to site")}
            >
              <Link
                to="/"
                className={cn(
                  "inline-flex items-center text-muted-foreground hover:text-foreground",
                  isMobile ? "size-9 justify-center" : "gap-2",
                )}
              >
                <Home className="size-4 shrink-0 rtl:-scale-x-100" aria-hidden />
                <span className={cn("font-medium", isMobile ? "sr-only" : "text-sm")}>
                  {t("dashboard.backToSite", "Back to site")}
                </span>
              </Link>
            </Button>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            {token && user && (
              <>
                {!isMobile && <MessageIcon />}
                <NotificationBell />
              </>
            )}
            <LanguageSwitcher compact={isMobile} />
            <ThemeToggle />
            {token && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size={isMobile ? "icon" : "default"} className={cn("shrink-0", !isMobile && "gap-2")}>
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">{user.name?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-24 truncate sm:inline">{user.name}</span>
                    <ChevronDown className="hidden size-4 sm:inline" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/">{t("nav.home", "Home")}</Link>
                  </DropdownMenuItem>
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
