import {
  LayoutDashboard,
  Package,
  Heart,
  Search,
  MessageSquare,
  Settings,
  Shield,
  Wallet,
  Landmark,
  Bell,
  CircleHelp,
  Star,
  MapPin,
  Gavel,
  FileText,
  Building2,
} from "lucide-react"

/**
 * Single source of truth for member dashboard sidebar links (user shell).
 */
export const dashboardUserNavLinks = [
  { to: "/dashboard", labelKey: "dashboard.overview", icon: LayoutDashboard },
  { to: "/dashboard/orders", labelKey: "dashboard.orderTracking", icon: Package },
  { to: "/dashboard/bids", labelKey: "dashboard.myBids", icon: Gavel },
  { to: "/dashboard/view-requests", labelKey: "dashboard.viewRequests", icon: MapPin },
  { to: "/dashboard/reviews", labelKey: "dashboard.reviewsReceived", icon: Star },
  { to: "/dashboard/balance", labelKey: "dashboard.walletMenu", icon: Wallet },
  { to: "/dashboard/guarantee", labelKey: "dashboard.financialGuarantee", icon: Landmark },
  { to: "/dashboard/reports", labelKey: "dashboard.reportsTitle", icon: FileText },
  { to: "/dashboard/wholesale", labelKey: "dashboard.wholesaleManager", icon: Building2 },
  { to: "/dashboard/profile", labelKey: "dashboard.personalData", icon: Settings },
  { to: "/dashboard/verification", labelKey: "dashboard.verification", icon: Shield },
  { to: "/dashboard/messages", labelKey: "dashboard.messages", icon: MessageSquare },
  { to: "/dashboard/notifications", labelKey: "dashboard.notifications", icon: Bell },
  { to: "/dashboard/listings", labelKey: "dashboard.listings", icon: Package },
  { to: "/dashboard/favorites", labelKey: "dashboard.favorites", icon: Heart },
  { to: "/dashboard/saved-searches", labelKey: "dashboard.savedSearches", icon: Search },
  { to: "/dashboard/help", labelKey: "dashboard.help", icon: CircleHelp },
]
