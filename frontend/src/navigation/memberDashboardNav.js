import {
  LayoutDashboard,
  Package,
  MessageSquare,
  Wallet,
  CircleHelp,
  UserCircle,
  Megaphone,
} from "lucide-react"

/**
 * Enterprise member dashboard: grouped nav + hub prefix matching.
 * @typedef {{ id: string, to: string, labelKey: string, icon: import("lucide-react").LucideIcon, visible?: (user: object | null) => boolean }} MemberNavItem
 * @typedef {{ id: string, labelKey: string, items: MemberNavItem[] }} MemberNavSection
 */

/** @param {string} pathname */
function matchOrdersHub(pathname) {
  return pathname === "/dashboard/orders" || pathname.startsWith("/dashboard/orders/")
}

/** @param {string} pathname */
function matchWalletHub(pathname) {
  return pathname === "/dashboard/wallet" || pathname.startsWith("/dashboard/wallet/")
}

/** @param {string} pathname */
function matchMessagesHub(pathname) {
  return pathname.startsWith("/dashboard/messages")
}

/** @param {string} pathname */
function matchAccountHub(pathname) {
  return (
    pathname.startsWith("/dashboard/account") ||
    pathname.startsWith("/dashboard/profile") ||
    pathname.startsWith("/dashboard/verification") ||
    pathname.startsWith("/dashboard/reports") ||
    pathname.startsWith("/dashboard/payment-setup") ||
    (pathname.startsWith("/dashboard/account") && pathname.includes("tab=payments"))
  )
}

/** @param {string} pathname */
function matchListingsHub(pathname) {
  return pathname.startsWith("/dashboard/listings") || pathname.startsWith("/dashboard/wholesale")
}

/**
 * @param {MemberNavItem} item
 * @param {{ pathname: string }} location
 */
export function isMemberNavItemActive(item, location) {
  const p = location.pathname
  switch (item.id) {
    case "overview":
      return p === "/dashboard"
    case "orders":
      return matchOrdersHub(p)
    case "wallet":
      return matchWalletHub(p)
    case "messages":
      return matchMessagesHub(p)
    case "account":
      return matchAccountHub(p)
    case "listings":
      return matchListingsHub(p)
    case "help":
      return p === "/dashboard/help" || p.startsWith("/dashboard/help/")
    default:
      return p === item.to || p.startsWith(`${item.to}/`)
  }
}

/**
 * @param {object | null} user
 * @returns {MemberNavSection[]}
 */
export function getMemberDashboardNavSections(user) {
  /** @type {MemberNavItem[]} */
  const primary = [
    { id: "overview", to: "/dashboard", labelKey: "dashboard.overview", icon: LayoutDashboard },
    { id: "orders", to: "/dashboard/orders", labelKey: "dashboard.nav.orderCenter", icon: Package },
    { id: "wallet", to: "/dashboard/wallet", labelKey: "dashboard.nav.wallet", icon: Wallet },
    { id: "messages", to: "/dashboard/messages", labelKey: "dashboard.nav.inbox", icon: MessageSquare },
    { id: "account", to: "/dashboard/account", labelKey: "dashboard.nav.account", icon: UserCircle },
    { id: "listings", to: "/dashboard/listings", labelKey: "dashboard.nav.listings", icon: Megaphone },
    { id: "help", to: "/dashboard/help", labelKey: "dashboard.nav.help", icon: CircleHelp },
  ]

  const items = primary.filter((item) => (item.visible ? item.visible(user) : true))

  return [
    {
      id: "workspace",
      labelKey: "dashboard.nav.sectionWorkspace",
      items,
    },
  ]
}

/**
 * Flat list for legacy consumers (e.g. account drawer menu).
 * @param {object | null} user
 */
export function getMemberDashboardNavFlat(user) {
  return getMemberDashboardNavSections(user).flatMap((s) => s.items)
}
