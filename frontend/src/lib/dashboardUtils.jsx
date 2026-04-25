import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { enUS } from "date-fns/locale"
import {
  Package,
  Truck,
  MessageCircle,
  Gavel,
  Star,
  Bell,
  Flag,
  MapPin,
} from "lucide-react"

const LOCALE_MAP = { ar, en: enUS }

/**
 * Returns translation key for greeting based on current hour.
 */
export function getGreetingKey() {
  const hour = new Date().getHours()
  if (hour < 12) return "dashboard.home.goodMorning"
  if (hour < 17) return "dashboard.home.goodAfternoon"
  return "dashboard.home.goodEvening"
}

/** @deprecated Use getGreetingKey + t() instead */
export function formatGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "صباح الخير"
  if (hour < 17) return "مساء الخير"
  return "مساء النور"
}

/**
 * Returns relative time (locale-aware).
 */
export function formatRelativeTime(date, locale = "ar") {
  if (!date) return ""
  const d = date instanceof Date ? date : new Date(date)
  const loc = LOCALE_MAP[locale] ?? ar
  return formatDistanceToNow(d, { addSuffix: true, locale: loc })
}

/**
 * Returns translation key for status.
 */
export function getStatusKey(status) {
  return `dashboard.status.${status}`
}

/**
 * Maps status to Badge variant.
 */
export function getStatusVariant(status) {
  const variants = {
    pending: "secondary",
    cod_requested: "secondary",
    awaiting_payment: "default",
    paid: "default",
    shipped: "outline",
    delivered: "outline",
    completed: "default",
    cancelled: "destructive",
    disputed: "destructive",
    refunded: "secondary",
  }
  return variants[status] ?? "secondary"
}

/**
 * Returns Lucide icon for notification type.
 */
export function getNotificationIcon(type) {
  const icons = {
    order_new: Package,
    order_status: Truck,
    message_new: MessageCircle,
    bid_new: Gavel,
    review_new: Star,
    staff_profile_report_new: Flag,
    view_request_new: MapPin,
    view_request_approved: MapPin,
    view_request_declined: MapPin,
    view_request_cancelled: MapPin,
  }
  const Icon = icons[type] ?? Bell
  return <Icon size={14} className={type === "order_new" ? "text-primary" : type === "message_new" ? "text-green-500" : type === "bid_new" ? "text-orange-500" : type === "review_new" ? "text-yellow-500" : type?.startsWith?.("view_request") ? "text-sky-600" : "text-muted-foreground"} />
}

/**
 * Returns Tailwind bg class for notification icon container.
 */
export function getNotificationIconBg(type) {
  const bg = {
    order_new: "bg-primary/10",
    message_new: "bg-green-500/10",
    bid_new: "bg-orange-500/10",
    review_new: "bg-yellow-500/10",
    staff_profile_report_new: "bg-destructive/10",
    view_request_new: "bg-sky-500/10",
    view_request_approved: "bg-sky-500/10",
    view_request_declined: "bg-muted",
    view_request_cancelled: "bg-muted",
  }
  return bg[type] ?? "bg-muted"
}
