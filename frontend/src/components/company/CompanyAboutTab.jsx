import { useTranslation } from "react-i18next"
import { CompanyActivityChips } from "@/components/company/CompanyActivityChips"
import { BadgeCheck, Building, Mail, MapPin, Phone } from "lucide-react"

/** "عن الشركة": about text, activities, verification, city and contact. */
export function CompanyAboutTab({ company, user }) {
  const { t } = useTranslation()
  const about = company?.description || user?.bio

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_300px]">
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="flex items-center gap-2 text-base font-bold">
          <Building className="size-5 text-primary" aria-hidden />
          {company?.name}
          {company?.is_verified ? <BadgeCheck className="size-5 text-sky-500" aria-label={t("videoComments.verifiedCompany", "شركة موثّقة")} /> : null}
        </h3>
        <CompanyActivityChips activities={company?.activities} className="mt-3" />
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {about || t("companyChannel.noAbout", "لم تُضف الشركة نبذة بعد.")}
        </p>
      </section>
      <aside className="space-y-3 rounded-xl border border-border bg-card p-5 text-sm">
        {company?.city ? (
          <p className="flex items-center gap-2">
            <MapPin className="size-4 text-muted-foreground" aria-hidden />
            {company.city}
          </p>
        ) : null}
        {company?.phone ? (
          <a href={`tel:${company.phone}`} className="flex items-center gap-2 text-primary" dir="ltr">
            <Phone className="size-4" aria-hidden />
            {company.phone}
          </a>
        ) : null}
        {company?.email ? (
          <a href={`mailto:${company.email}`} className="flex items-center gap-2 break-all text-primary" dir="ltr">
            <Mail className="size-4 shrink-0" aria-hidden />
            {company.email}
          </a>
        ) : null}
        {company?.fal_license_no ? (
          <p className="text-muted-foreground">
            {t("companyChannel.falLicense", "رخصة فال")}:{" "}
            <span className="font-semibold text-foreground tabular-nums" dir="ltr">{company.fal_license_no}</span>
          </p>
        ) : null}
        <p className="flex items-center gap-2 text-muted-foreground">
          <BadgeCheck className="size-4" aria-hidden />
          {company?.is_verified
            ? t("companyChannel.verified", "شركة موثّقة من منصة عروض")
            : t("companyChannel.notVerified", "التوثيق قيد المراجعة")}
        </p>
      </aside>
    </div>
  )
}
