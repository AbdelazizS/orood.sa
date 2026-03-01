/**
 * Format date as relative time (e.g. "2 hours ago")
 */
export function timeAgo(dateStr, t) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d

  if (diff < 60000) return t("timeAgo.justNow", "Just now")
  if (diff < 3600000) return t("timeAgo.minutesAgo", "{{count}} min ago", { count: Math.floor(diff / 60000) })
  if (diff < 86400000) return t("timeAgo.hoursAgo", "{{count}} hours ago", { count: Math.floor(diff / 3600000) })
  if (diff < 604800000) return t("timeAgo.daysAgo", "{{count}} days ago", { count: Math.floor(diff / 86400000) })
  if (diff < 2592000000) return t("timeAgo.weeksAgo", "{{count}} weeks ago", { count: Math.floor(diff / 604800000) })

  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
