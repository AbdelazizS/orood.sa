import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Clock3 } from "lucide-react"
import { cn } from "@/lib/utils"

export function WholesaleDealCountdown({ expiresAtIso, className, dir = "rtl" }) {
  const { t, i18n } = useTranslation()
  const [now, setNow] = useState(() => Date.now())

  const expires = useMemo(() => {
    if (!expiresAtIso) return null
    const t0 = Date.parse(String(expiresAtIso))
    return Number.isNaN(t0) ? null : t0
  }, [expiresAtIso])

  useEffect(() => {
    if (!expires) return
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [expires])

  if (!expires) return null

  const diff = expires - now
  if (diff <= 0) {
    return (
      <div dir={dir} className={cn("wholesale-type-caption flex items-center gap-2 text-destructive", className)}>
        <Clock3 className="size-4 shrink-0" aria-hidden />
        {t("wholesale.pdp.countdownEnded")}
      </div>
    )
  }

  const totalMin = Math.ceil(diff / 60_000)
  const days = Math.floor(totalMin / (60 * 24))
  const hours = Math.floor((totalMin - days * 24 * 60) / 60)
  const mins = totalMin % 60

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-SA"
  let label = ""
  if (days > 0) {
    label = t("wholesale.pdp.countdownDaysHours", { days, hours })
  } else if (hours > 0) {
    label = t("wholesale.pdp.countdownHoursMins", { hours, mins })
  } else {
    label = t("wholesale.pdp.countdownMins", { mins: Math.max(1, mins) })
  }

  return (
    <div dir={dir} className={cn("flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5", className)}>
      <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 text-start">
        <p className="wholesale-type-caption">{t("wholesale.pdp.countdownLabel")}</p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {new Date(expires).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>
    </div>
  )
}
