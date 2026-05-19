import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Building2, MapPin, Package, Star } from "lucide-react"
import { resolveImageUrl } from "@/lib/imageUrl"
import { CoverBanner } from "@/components/shared/CoverBanner"
import { WholesaleCompanyBadges } from "@/components/wholesale/WholesaleCompanyBadges"
import { WholesaleCompanyHeroActions } from "@/components/wholesale/WholesaleCompanyHeroActions"
import { formatWholesaleCompanyLocation } from "@/lib/wholesaleCompanyFilters"

export function WholesaleCompanyHero({ company, t, dir = "rtl", featuredProductId = null }) {
  if (!company) return null

  const initial = (company?.name?.[0] ?? "C").toUpperCase()
  const [logoBroken, setLogoBroken] = useState(false)
  const rawLogo = company?.logo_url ? resolveImageUrl(company.logo_url) : ""
  const logoSrc = rawLogo && !logoBroken ? rawLogo : undefined
  const rating = company?.rating != null ? Number(company.rating) : null
  const productsCount = Number(company?.products_count ?? 0)
  const active = Number(company?.active_wholesale_campaigns_count ?? 0)
  const completed = Number(company?.completed_wholesale_campaigns_count ?? 0)
  const seats = Number(company?.total_wholesale_seats_reserved ?? 0)
  const buyers = Number(company?.distinct_wholesale_buyers_count ?? 0)
  const activeCampaigns = Number(company?.active_wholesale_campaigns_count ?? 0)
  const locationLine = formatWholesaleCompanyLocation(company)

  return (
    <section
      dir={dir}
      className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]"
    >
      <CoverBanner coverUrl={company?.hero_cover_url} showTopScrim={false} />
      <div className="relative px-5 pb-4 pt-0 sm:px-8">
        <div className="-mt-10 flex flex-col gap-4 sm:-mt-11 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-end gap-4 text-start">
            <Avatar className="size-20 shrink-0 border-4 border-background bg-background shadow-lg ring-2 ring-border/50 sm:size-24">
              <AvatarImage src={logoSrc} alt="" className="object-cover" onError={() => setLogoBroken(true)} />
              <AvatarFallback className="text-lg font-semibold">{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-2 pb-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="wholesale-type-title text-balance text-foreground">{company.name}</h1>
                {company?.is_verified ? (
                  <WholesaleCompanyBadges isVerified activeCampaigns={activeCampaigns} t={t} position="inline" />
                ) : (
                  <Badge variant="secondary" className="gap-1 rounded-full">
                    <Building2 className="size-3.5 shrink-0" aria-hidden />
                    {t("wholesale.companyProfile.businessBadge")}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                {locationLine ? (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    <span>{locationLine}</span>
                  </span>
                ) : null}
                {company?.category ? (
                  <Badge variant="outline" className="gap-1 rounded-full font-normal">
                    <Package className="size-3.5 shrink-0" aria-hidden />
                    {company.category}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          <WholesaleCompanyHeroActions
            company={company}
            featuredProductId={featuredProductId}
            className="border-0 px-0 py-0 sm:shrink-0"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-border/60 bg-border/60 sm:grid-cols-3 lg:grid-cols-6">
        <StatCell label={t("wholesale.companyProfile.statListings")} value={productsCount} />
        <StatCell label={t("wholesale.companyProfile.statActiveCampaigns")} value={active} />
        <StatCell label={t("wholesale.companyProfile.statCompletedCampaigns")} value={completed} />
        <StatCell label={t("wholesale.companyProfile.statSeatsReserved")} value={seats} />
        <StatCell label={t("wholesale.companyProfile.statBuyers")} value={buyers} />
        <div className="col-span-2 flex flex-col justify-center bg-background px-4 py-4 text-start sm:col-span-1 sm:px-5">
          <p className="wholesale-type-caption">{t("wholesale.companyProfile.statRating")}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
            {rating != null && Number.isFinite(rating) ? rating.toFixed(1) : "—"}
            <Star className="size-5 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
          </p>
        </div>
      </div>
    </section>
  )
}

function StatCell({ label, value }) {
  return (
    <div className="bg-background px-4 py-4 text-start sm:px-5">
      <p className="wholesale-type-caption">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground sm:text-2xl">{value ?? 0}</p>
    </div>
  )
}
