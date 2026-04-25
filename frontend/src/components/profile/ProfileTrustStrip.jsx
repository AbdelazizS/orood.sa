import { useTranslation } from "@/hooks/useTranslation"
import { Star, Clock, BadgeCheck, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

function formatNumber(value, language) {
  return new Intl.NumberFormat(language === "ar" ? "ar-SA" : "en-US").format(Number(value || 0))
}

function TrustStatCard({ icon: Icon, value, label, iconClassName, detail }) {
  return (
    <div
      className={cn(
        "flex min-h-[7.25rem] flex-col gap-2 rounded-lg border border-border bg-card p-4 text-start",
        "sm:min-h-[7.5rem]",
      )}
    >
      <Icon className={cn("size-5 shrink-0 text-muted-foreground", iconClassName)} aria-hidden />
      <p className="text-xl font-semibold leading-tight tabular-nums text-foreground sm:text-2xl">{value}</p>
      {detail ? (
        <p className="text-xs leading-snug tabular-nums text-muted-foreground sm:text-sm">{detail}</p>
      ) : null}
      <p className="mt-auto text-xs leading-snug text-muted-foreground sm:text-sm">{label}</p>
    </div>
  )
}

export function ProfileTrustStrip({ user, reviewSummary, className }) {
  const { t, language } = useTranslation()
  const totalRatings = Number(reviewSummary?.total ?? user?.total_ratings ?? 0)
  const avg = Number(reviewSummary?.average ?? user?.rating ?? 0)
  const ratingDisplay = totalRatings === 0 ? "—" : formatNumber(avg, language)
  const ratingDetail =
    totalRatings > 0
      ? t("publicProfile.reviewsCountLabel", {
          count: formatNumber(totalRatings, language),
          defaultValue: "{{count}} reviews",
        })
      : null

  const lastSeenDisplay =
    user?.is_online === true
      ? t("publicProfile.onlineNow", "متصل الآن")
      : user?.last_seen_human?.trim() || "—"

  const completedDisplay = formatNumber(user?.completed_orders ?? 0, language)
  const listingsDisplay = formatNumber(user?._count?.listings ?? 0, language)

  return (
    <section
      className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}
      aria-label={t("publicProfile.trustStripLabel", "مؤشرات الثقة")}
    >
      <TrustStatCard
        icon={Star}
        value={ratingDisplay}
        detail={ratingDetail}
        label={t("publicProfile.stats.rating")}
        iconClassName="text-amber-500/90"
      />
      <TrustStatCard icon={Clock} value={lastSeenDisplay} label={t("publicProfile.stats.lastSeen", "آخر ظهور")} />
      <TrustStatCard
        icon={BadgeCheck}
        value={completedDisplay}
        label={t("publicProfile.stats.completedOrders")}
        iconClassName="text-emerald-600/90 dark:text-emerald-400/90"
      />
      <TrustStatCard
        icon={ClipboardList}
        value={listingsDisplay}
        label={t("publicProfile.stats.activeListings", "إعلانات نشطة")}
      />
    </section>
  )
}
