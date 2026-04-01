import { useTranslation } from "react-i18next"
import { Eye, MessageSquare, ShoppingBag, User } from "lucide-react"

/**
 * Stats bar: views, replies, purchases, message contacts.
 */
export function ProductStatsBar({ stats = {} }) {
  const { t } = useTranslation()
  const views = stats.views ?? 0
  const comments = stats.comments ?? 0
  const purchases = stats.purchases ?? 0
  const messages = stats.messages ?? 0

  const items = [
    { icon: Eye, value: views, label: t("productDetails.statsViews", "مشاهدات") },
    { icon: MessageSquare, value: comments, label: t("productDetails.statsReplies", "ردود") },
    { icon: ShoppingBag, value: purchases, label: t("productDetails.statsPurchases", "مشتريات") },
    { icon: User, value: messages, label: t("productDetails.statsContacts", "تواصلوا") },
  ]

  return (
    <div className="flex flex-wrap gap-6 rounded-xl border bg-muted/30 px-4 py-3">
      {items.map(({ icon: Icon, value, label }) => (
        <span key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="size-4 shrink-0" />
          <span className="font-medium text-foreground">{value}</span>
          <span>{label}</span>
        </span>
      ))}
    </div>
  )
}
