import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
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
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Package,
  Heart,
  Search,
  MessageSquare,
  FolderTree,
  Users,
  Settings,
  ShoppingCart,
  BarChart3,
  ClipboardList,
  ShieldCheck,
  MapPin,
  Mail,
  Megaphone,
  Eye,
} from "lucide-react"

const userLinks = [
  { to: "/dashboard", labelKey: "dashboard.overview", icon: LayoutDashboard },
  { to: "/dashboard/listings", labelKey: "dashboard.listings", icon: Package },
  { to: "/dashboard/favorites", labelKey: "dashboard.favorites", icon: Heart },
  { to: "/dashboard/saved-searches", labelKey: "dashboard.savedSearches", icon: Search },
  { to: "/dashboard/messages", labelKey: "dashboard.messages", icon: MessageSquare },
]

const adminLinks = [
  { to: "/admin", labelKey: "dashboard.overview", icon: LayoutDashboard },
  { to: "/admin/orders", labelKey: "admin.ordersTitle", icon: ShoppingCart },
  { to: "/admin/products", labelKey: "admin.offersAndRequests", icon: Package },
  { to: "/admin/users", labelKey: "dashboard.users", icon: Users },
  { to: "/admin/categories", labelKey: "dashboard.categories", icon: FolderTree },
  { to: "/admin/regions", labelKey: "admin.regions", icon: MapPin },
  { to: "/admin/tasks", labelKey: "admin.tasks", icon: ClipboardList },
  { to: "/admin/contact-inquiries", labelKey: "admin.contactInquiries", icon: Mail },
  { to: "/admin/announcements", labelKey: "admin.announcements", icon: Megaphone },
  { to: "/admin/messages", labelKey: "admin.messagesTitle", icon: MessageSquare },
  { to: "/admin/visitors", labelKey: "admin.visitorsTitle", icon: Eye },
  { to: "/admin/analytics", labelKey: "analytics.title", icon: BarChart3 },
  { to: "/admin/verifications", labelKey: "admin.verifications", icon: ShieldCheck },
  { to: "/admin/audit", labelKey: "dashboard.auditLogs", icon: Settings },
]

export function AppSidebar({ isAdmin = false }) {
  const location = useLocation()
  const { t } = useTranslation()
  const links = isAdmin ? adminLinks : userLinks

  return (
    <Sidebar collapsible="icon" className="border-e">
      <SidebarHeader className="border-b p-4">
        <Link to="/" className="font-semibold text-lg">
          {t("common.brandName")}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("dashboard.overview")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((link) => (
                <SidebarMenuItem key={link.to}>
                  <SidebarMenuButton asChild isActive={location.pathname === link.to || location.pathname.startsWith(link.to + "/")}>
                    <Link to={link.to}>
                      <link.icon className="size-4" />
                      <span>{t(link.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
