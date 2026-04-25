import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { ExpandableText } from "@/components/ui/ExpandableText"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export function ProfileBioMap({ user, company, isOwner, className }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const lat = user?.location_lat != null ? Number(user.location_lat) : null
  const lng = user?.location_lng != null ? Number(user.location_lng) : null
  const hasCoords = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)
  const mapSrc = hasCoords
    ? `https://maps.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=14&output=embed`
    : null

  const companySubline = useMemo(() => {
    const cityRaw = company?.city
    const city =
      typeof cityRaw === "string"
        ? cityRaw.trim()
        : cityRaw != null && typeof cityRaw === "object" && "name" in cityRaw
          ? String(cityRaw.name ?? "").trim()
          : ""
    const types = Array.isArray(company?.product_types) ? company.product_types.filter(Boolean) : []
    const typesStr = types.join(" · ")
    if (city && typesStr) return `${city} · ${typesStr}`
    if (city) return city
    if (typesStr) return typesStr
    return ""
  }, [company])

  return (
    <div dir={direction} className={cn("space-y-4", className)}>
      {user?.bio ? (
        <section className="rounded-lg border bg-card p-4 text-start">
          <h2 className="mb-2 border-b border-border/60 pb-2 text-sm font-semibold">
            {t("publicProfile.bioSectionTitle", "نبذة عني")}
          </h2>
          <ExpandableText text={user.bio} />
        </section>
      ) : isOwner ? (
        <section className="rounded-lg border border-dashed border-border/80 bg-card/60 p-4 text-start">
          <p className="text-sm italic text-muted-foreground">{t("publicProfile.ownerNoBioHint")}</p>
        </section>
      ) : null}

      {company?.name ? (
        <section className="rounded-lg border bg-card p-4 text-start">
          <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
            <p className="min-w-0 flex-1 text-base font-semibold leading-snug text-foreground">{company.name}</p>
            {company.is_verified ? (
              <Badge variant="secondary" className="shrink-0 gap-1 border-primary/30 bg-primary/10 text-primary">
                <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
                {t("publicProfile.companyVerifiedBadge", "موثق")}
              </Badge>
            ) : null}
          </div>
          {companySubline ? (
            <p className="mt-2 text-sm text-muted-foreground">{companySubline}</p>
          ) : null}
        </section>
      ) : null}

      {mapSrc ? (
        <section className="overflow-hidden rounded-lg border bg-card text-start">
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold">{t("publicProfile.mapTitle", "الموقع")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("publicProfile.mapSubtitle", "موقع المستخدم على الخريطة")}</p>
          </div>
          <div className="aspect-video w-full bg-muted">
            <iframe
              title={t("publicProfile.mapTitle", "الموقع")}
              src={mapSrc}
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      ) : null}
    </div>
  )
}
