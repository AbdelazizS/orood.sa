import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Store } from "lucide-react"

export function ProfileWholesaleStorefrontCta({ companyId, isVerified = false }) {
  const { t } = useTranslation()
  if (!companyId) return null

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 text-start">
          <Store className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">{t("profile.wholesaleStorefront.title")}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("profile.wholesaleStorefront.subtitle")}</p>
          </div>
        </div>
        <Button className="min-h-11 shrink-0 rounded-xl px-6" asChild>
          <Link to={`/wholesale/company/${companyId}`}>
            {t("profile.wholesaleStorefront.cta")}
            {isVerified ? ` · ${t("wholesale.companyProfile.verifiedBadge")}` : ""}
          </Link>
        </Button>
      </div>
    </div>
  )
}
