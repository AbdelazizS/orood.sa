import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { ExpandableText } from "@/components/ui/ExpandableText"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck } from "lucide-react"
import { LocationMapPreview } from "@/components/maps/LocationMapPreview.jsx"
import {
  getCompanyProductTypesLine,
  getProfileLocationLine,
  isRedundantLocationSubtitle,
  shouldHideRedundantCompanyCard,
} from "@/lib/profile/locationDisplay"
import { cn } from "@/lib/utils"

export function ProfileBioMap({ user, company, isOwner, className }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const lat = user?.location_lat != null ? Number(user.location_lat) : null
  const lng = user?.location_lng != null ? Number(user.location_lng) : null
  const hasCoords = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)

  const companySubline = useMemo(() => getCompanyProductTypesLine(company), [company])

  const hideCompanyCard = useMemo(
    () => shouldHideRedundantCompanyCard(user, company),
    [user, company],
  )

  const userCityLine =
    typeof user?.city === "string"
      ? user.city
      : user?.city?.name
        ? String(user.city.name)
        : ""

  const mapSubtitleRaw =
    user?.location_address?.trim() ||
    userCityLine ||
    t("publicProfile.mapSubtitle", "موقع المستخدم على الخريطة")

  const headerLocationLine = getProfileLocationLine(user)
  const mapSubtitle = isRedundantLocationSubtitle(headerLocationLine, mapSubtitleRaw)
    ? ""
    : mapSubtitleRaw

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

      {company?.name && !hideCompanyCard ? (
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

      {hasCoords ? (
        <LocationMapPreview
          lat={lat}
          lng={lng}
          title={t("publicProfile.mapTitle", "الموقع")}
          subtitle={mapSubtitle}
          label={user?.name ?? ""}
          dir={direction}
          markerId={`profile-${user?.id ?? "user"}`}
          showAttribution={false}
        />
      ) : isOwner ? (
        <section className="rounded-lg border border-dashed border-border/80 bg-card/60 p-4 text-start">
          <p className="text-sm italic text-muted-foreground">
            {t("publicProfile.ownerNoLocationHint", "Add your location in personal data to show a map here.")}
          </p>
        </section>
      ) : null}
    </div>
  )
}
