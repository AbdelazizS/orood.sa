import { useTranslation } from "react-i18next"
import { ShieldCheck, Truck, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

const KEYS = [
  { key: "verified", icon: ShieldCheck, titleKey: "wholesale.companies.trust.verifiedTitle", bodyKey: "wholesale.companies.trust.verifiedBody" },
  { key: "delivery", icon: Truck, titleKey: "wholesale.companies.trust.deliveryTitle", bodyKey: "wholesale.companies.trust.deliveryBody" },
  { key: "record", icon: ClipboardList, titleKey: "wholesale.companies.trust.recordTitle", bodyKey: "wholesale.companies.trust.recordBody" },
]

/** Bottom-of-page trust block for the wholesale companies directory. */
export function WholesaleCompaniesTrustSection({ pageDir, className }) {
  const { t } = useTranslation()
  return (
    <section dir={pageDir} className={cn("border-t border-border/60 bg-muted/20 px-4 py-10 sm:px-6", className)}>
      <div className="mx-auto max-w-[1440px]">
        <h2 className="text-center text-lg font-semibold text-foreground">{t("wholesale.companies.trust.sectionTitle")}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {KEYS.map((item) => {
            const Icon = item.icon
            return (
              <li
                key={item.key}
                className="flex gap-3 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm sm:flex-col sm:items-start sm:text-start"
              >
                <Icon className="size-8 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{t(item.titleKey)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(item.bodyKey)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
