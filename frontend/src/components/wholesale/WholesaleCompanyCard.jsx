import { useState } from "react"
import { Link } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, MapPin, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/imageUrl"
import { usePrefersReducedMotion } from "@/hooks/maps/useMapInteractions"
import { CoverBanner } from "@/components/shared/CoverBanner"
import { WholesaleCompanyBadges } from "@/components/wholesale/WholesaleCompanyBadges"
import { formatWholesaleCompanyLocation } from "@/lib/wholesaleCompanyFilters"

export function WholesaleCompanyCard({ company, t, compact = false, dir = "rtl" }) {
  const reduceMotion = usePrefersReducedMotion()
  const initial = (company?.name?.[0] ?? "C").toUpperCase()
  const [logoBroken, setLogoBroken] = useState(false)

  const rawLogo = company?.logo_url ? resolveImageUrl(company.logo_url) : ""
  const logoSrc = rawLogo && !logoBroken ? rawLogo : undefined

  const activeCampaigns = Number(company?.active_wholesale_campaigns_count ?? 0)
  const categoryLabel = company?.category?.trim?.() ? company.category.trim() : null
  const locationLabel = formatWholesaleCompanyLocation(company)

  return (
    <Card
      dir={dir}
      className={cn(
        "group flex h-full min-w-0 flex-col gap-0 overflow-hidden rounded-[28px] border border-black/5 bg-background py-0 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_12px_32px_rgba(0,0,0,0.04)] ring-0 transition-colors dark:border-white/10",
        !reduceMotion && "hover:bg-muted/30",
        compact && "max-w-md"
      )}
    >
      <div className="relative w-full shrink-0">
        <CoverBanner coverUrl={company?.hero_cover_url} rounded="card" showTopScrim>
          <WholesaleCompanyBadges
            isVerified={company?.is_verified}
            activeCampaigns={activeCampaigns}
            t={t}
            position="overlay"
          />
        </CoverBanner>
      </div>
      <div className="flex flex-1 flex-col gap-3 bg-background px-4 pb-4 pt-0 text-start sm:gap-4 sm:px-5 sm:pb-5">
        <div className="relative z-10 -mt-7 flex gap-3 sm:-mt-8 sm:gap-4">
          <Avatar className="size-16 shrink-0 border-4 border-background bg-background shadow-lg ring-2 ring-border/30 sm:size-[4.25rem]">
            <AvatarImage src={logoSrc} alt="" className="object-cover" onError={() => setLogoBroken(true)} />
            <AvatarFallback className="text-base font-semibold">{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2 pt-1 sm:pt-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/wholesale/company/${company.id}`}
                className="line-clamp-2 text-lg font-semibold leading-snug text-foreground hover:text-primary hover:underline"
              >
                {company?.name}
              </Link>
              {!company?.is_verified ? <Building2 className="size-5 shrink-0 text-muted-foreground" aria-hidden /> : null}
            </div>
            {company?.hero_tagline ? (
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{company.hero_tagline}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {locationLabel ? (
                <>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    <span>{locationLabel}</span>
                  </span>
                  <span className="text-border" aria-hidden>
                    ·
                  </span>
                </>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Package className="size-3.5 shrink-0" aria-hidden />
                <span>{t("wholesale.companies.productsCount", { count: company?.products_count ?? 0 })}</span>
              </span>
            </div>
          </div>
        </div>
        {!compact && categoryLabel ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-0.5 text-xs font-normal">
              {categoryLabel}
            </Badge>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            {t("wholesale.companies.cardActiveLabel")}:{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {Number(company?.active_wholesale_campaigns_count ?? 0)}
            </span>
          </span>
          <span>
            {t("wholesale.companies.cardCompletedLabel")}:{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {Number(company?.completed_wholesale_campaigns_count ?? 0)}
            </span>
          </span>
          <span>
            {t("wholesale.companies.cardBuyersLabel")}:{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {Number(company?.distinct_wholesale_buyers_count ?? 0)}
            </span>
          </span>
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <Button className="h-11 w-full rounded-2xl text-sm font-medium shadow-sm" asChild>
            <Link to={`/wholesale/company/${company.id}`}>{t("wholesale.companies.viewProductsCta")}</Link>
          </Button>
        </div>
      </div>
    </Card>
  )
}
