import {
  LayoutDashboard,
  Megaphone,
  FolderCheck,
  MessageSquare,
  Headset,
  Coins,
  UserCircle,
} from "lucide-react"

/**
 * Subscriber dashboard sidebar (hidden account type that buys ads of listings awaiting a marketer).
 * @type {Array<{ id: string, labelKey: string, items: Array<{ id: string, to: string, labelKey: string, icon: import("lucide-react").LucideIcon }> }>}
 */
export const subscriberNavSections = [
  {
    id: "main",
    labelKey: "subscriber.nav.sectionMain",
    items: [
      { id: "overview", to: "/subscriber", labelKey: "subscriber.nav.overview", icon: LayoutDashboard },
      { id: "requests", to: "/subscriber/requests", labelKey: "subscriber.tabs.available", icon: Megaphone },
      { id: "mine", to: "/subscriber/my-listings", labelKey: "subscriber.tabs.mine", icon: FolderCheck, badge: "unread" },
    ],
  },
  {
    id: "contact",
    labelKey: "subscriber.nav.sectionContact",
    items: [
      { id: "messages", to: "/subscriber/messages", labelKey: "subscriber.nav.messages", icon: MessageSquare },
      { id: "support", to: "/subscriber/support", labelKey: "subscriber.nav.support", icon: Headset },
    ],
  },
  {
    id: "account",
    labelKey: "subscriber.nav.sectionAccount",
    items: [
      { id: "credits", to: "/subscriber/credits", labelKey: "subscriber.nav.credits", icon: Coins },
      { id: "account", to: "/subscriber/account", labelKey: "subscriber.nav.account", icon: UserCircle },
    ],
  },
]

/**
 * @param {{ id: string, to: string }} item
 * @param {{ pathname: string }} location
 */
export function isSubscriberNavItemActive(item, location) {
  const p = location.pathname
  if (item.id === "overview") return p === "/subscriber"
  // A listing's detail page belongs to "عروضي" when bought, otherwise to "طلبات التسويق" — keep requests active.
  if (item.id === "requests") return p.startsWith("/subscriber/requests") || p.startsWith("/subscriber/listings/")
  return p === item.to || p.startsWith(`${item.to}/`)
}
