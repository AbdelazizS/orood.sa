import { useTranslation } from "react-i18next"
import { Building2, Handshake, Store } from "lucide-react"
import { cn } from "@/lib/utils"

const ICONS = { marketer: Handshake, developer: Building2, seller: Store }

/** Real-estate company activity badges: مسوّق / مطوّر / بيع. */
export function CompanyActivityChips({ activities = [], className }) {
  const { t } = useTranslation()
  if (!activities?.length) return null

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {activities.map((a) => {
        const Icon = ICONS[a] ?? Store
        return (
          <span
            key={a}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
          >
            <Icon className="size-3.5" aria-hidden />
            {t(`companyChannel.activity.${a}`, a)}
          </span>
        )
      })}
    </div>
  )
}
