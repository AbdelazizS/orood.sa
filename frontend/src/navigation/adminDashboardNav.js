import {
  LayoutDashboard,
  Package,
  FolderTree,
  Users,
  Settings,
  BarChart3,
  Wallet,
  ShoppingCart,
  Gavel,
  Landmark,
  Shield,
  MapPin,
  ListTodo,
  Mail,
  Flag,
  UserRound,
  UserCog,
  Megaphone,
  MessageSquare,
  Eye,
  FileText,
  SlidersHorizontal,
  Search,
} from "lucide-react"

/**
 * @typedef {{ to: string, labelKey: string, icon: import("lucide-react").LucideIcon, permission?: string }} AdminNavItem
 * @typedef {{ id: string, labelKey: string, items: AdminNavItem[] }} AdminNavSection
 */

/** @type {AdminNavSection[]} */
export const adminNavSections = [
  {
    id: "overview",
    labelKey: "admin.navOverview",
    items: [
      { to: "/admin", labelKey: "admin.dashboardTitle", icon: LayoutDashboard },
      { to: "/admin/analytics", labelKey: "analytics.title", icon: BarChart3 },
    ],
  },
  {
    id: "commerce",
    labelKey: "admin.navCommerce",
    items: [
      { to: "/admin/orders", labelKey: "admin.ordersTitle", icon: ShoppingCart, permission: "orders.view" },
      { to: "/admin/bids", labelKey: "admin.bidsTitle", icon: Gavel, permission: "bids.admin_view" },
      { to: "/admin/products", labelKey: "admin.offersAndRequests", icon: Package },
      { to: "/admin/categories", labelKey: "dashboard.categories", icon: FolderTree },
    ],
  },
  {
    id: "finance",
    labelKey: "admin.navFinance",
    items: [
      { to: "/admin/finance-ops", labelKey: "admin.financeOpsTitle", icon: Wallet, permission: "settings.view" },
    ],
  },
  {
    id: "users",
    labelKey: "admin.navUsersTrust",
    items: [
      { to: "/admin/users", labelKey: "dashboard.users", icon: Users },
      { to: "/admin/assistants", labelKey: "admin.assistants.nav", icon: UserCog, permission: "assistants.manage" },
      { to: "/admin/companies", labelKey: "admin.companiesVerificationTitle", icon: Landmark },
      { to: "/admin/verifications", labelKey: "admin.verifications", icon: Shield, permission: "compliance.review_document_verifications" },
      { to: "/admin/listing-reports", labelKey: "admin.listingReports", icon: Flag },
      { to: "/admin/profile-reports", labelKey: "admin.profileReports", icon: UserRound },
    ],
  },
  {
    id: "content",
    labelKey: "admin.navContent",
    items: [
      { to: "/admin/announcements", labelKey: "admin.announcements", icon: Megaphone },
      { to: "/admin/messages", labelKey: "admin.messagesTitle", icon: MessageSquare },
      { to: "/admin/contact-inquiries", labelKey: "admin.contactInquiries", icon: Mail },
      { to: "/admin/tasks", labelKey: "admin.tasks", icon: ListTodo },
    ],
  },
  {
    id: "advanced",
    labelKey: "admin.navAdvanced",
    items: [
      { to: "/admin/regions", labelKey: "admin.regions", icon: MapPin },
      { to: "/admin/visitors", labelKey: "admin.visitorsTitle", icon: Eye },
      { to: "/admin/roles", labelKey: "admin.roles", icon: Shield, permission: "users.assign_roles" },
      { to: "/admin/settings", labelKey: "admin.settingsTitle", icon: SlidersHorizontal, permission: "settings.view" },
      { to: "/admin/seo", labelKey: "admin.seo.title", icon: Search, permission: "seo.manage" },
      { to: "/admin/audit", labelKey: "dashboard.auditLogs", icon: FileText },
    ],
  },
]

/**
 * @param {AdminNavItem} item
 * @param {{ pathname: string }} location
 */
export function isAdminNavItemActive(item, location) {
  const p = location.pathname
  if (item.to === "/admin") return p === "/admin"
  if (item.to === "/admin/finance-ops") {
    return (
      p === "/admin/finance-ops" ||
      p === "/admin/finance" ||
      p.startsWith("/admin/charges") ||
      p.startsWith("/admin/withdrawals") ||
      p.startsWith("/admin/financial-guarantees") ||
      p.startsWith("/admin/guarantee-requests")
    )
  }
  return p === item.to || p.startsWith(`${item.to}/`)
}
