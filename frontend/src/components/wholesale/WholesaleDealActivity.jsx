import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { formatDistanceToNow } from "date-fns"
import { ar, enUS } from "date-fns/locale"
import { cn } from "@/lib/utils"

/**
 * Recent reservation joins when API provides `joined_at` on participants (truthful only).
 */
export function WholesaleDealActivity({ participants = [], className, dir = "rtl" }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith("ar") ? ar : enUS

  const rows = useMemo(() => {
    const list = Array.isArray(participants) ? participants : []
    return list
      .filter((p) => p?.joined_at && p?.user?.name)
      .slice(0, 5)
      .map((p) => ({
        name: p.user.name,
        qty: Number(p.quantity ?? 1),
        ago: formatDistanceToNow(new Date(p.joined_at), { addSuffix: true, locale }),
      }))
  }, [participants])

  if (rows.length === 0) return null

  return (
    <div dir={dir} className={cn("rounded-xl border border-border/50 bg-muted/20 px-3 py-3", className)}>
      <p className="wholesale-type-caption mb-2">{t("wholesale.pdp.activityTitle")}</p>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {rows.map((r, i) => (
          <li key={i} className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium text-foreground">{r.name}</span>
            <span className="tabular-nums text-xs">
              {t("wholesale.pdp.activityLine", { qty: r.qty, time: r.ago })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
