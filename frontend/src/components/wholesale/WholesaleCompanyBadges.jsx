import { ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Verified + active wholesale badges shared by company card and profile hero.
 */
export function WholesaleCompanyBadges({
  isVerified = false,
  activeCampaigns = 0,
  t,
  className,
  position = "overlay",
}) {
  if (!isVerified && activeCampaigns <= 0) return null

  const isOverlay = position === "overlay"

  return (
    <div
      className={cn(
        isOverlay
          ? "absolute start-3 top-3 z-30 flex flex-wrap items-center gap-2 sm:start-4 sm:top-4"
          : "flex flex-wrap items-center gap-2",
        className
      )}
    >
      {isVerified ? (
        <Badge
          className={cn(
            "gap-1 rounded-full border-0 shadow-sm",
            isOverlay
              ? "bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground"
              : "bg-primary text-primary-foreground"
          )}
        >
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
          {t("wholesale.companyProfile.verifiedBadge")}
        </Badge>
      ) : null}
      {activeCampaigns > 0 ? (
        <Badge
          className={cn(
            "gap-1 rounded-full border-0 shadow-sm",
            isOverlay
              ? "bg-amber-600 px-2.5 py-0.5 text-xs font-medium text-white"
              : "bg-amber-600 text-white"
          )}
        >
          <Sparkles className="size-3.5 shrink-0" aria-hidden />
          {t("wholesale.companies.activeWholesaleBadge")}
        </Badge>
      ) : null}
    </div>
  )
}
