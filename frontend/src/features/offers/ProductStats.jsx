import { useTranslation } from "react-i18next"
import { Eye, Gavel, MessageSquare } from "lucide-react"

export function ProductStats({ stats = {} }) {
  const { t } = useTranslation()
  const views = stats.views ?? 0
  const bids = stats.bids ?? 0
  const messages = stats.messages ?? 0

  return (
    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Eye className="size-4" />
        {views} {t("feed.views")}
      </span>
      <span className="flex items-center gap-1.5">
        <Gavel className="size-4" />
        {bids} {t("bids.title")}
      </span>
      <span className="flex items-center gap-1.5">
        <MessageSquare className="size-4" />
        {messages} {t("productDetails.messages", "Messages")}
      </span>
    </div>
  )
}
