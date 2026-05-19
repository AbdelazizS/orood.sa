import { useTranslation } from "react-i18next"
import { BadgeCheck, Package, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { key: "verified", icon: BadgeCheck, titleField: "trust_verified_title", bodyField: "trust_verified_body", titleKey: "wholesale.market.trust.verifiedTitle", bodyKey: "wholesale.market.trust.verifiedBody" },
  { key: "delivery", icon: Package, titleField: "trust_delivery_title", bodyField: "trust_delivery_body", titleKey: "wholesale.market.trust.deliveryTitle", bodyKey: "wholesale.market.trust.deliveryBody" },
  { key: "payment", icon: Shield, titleField: "trust_payment_title", bodyField: "trust_payment_body", titleKey: "wholesale.market.trust.paymentTitle", bodyKey: "wholesale.market.trust.paymentBody" },
]

/**
 * @param {{ pageDir: string, getCopy?: (field: string, fallbackKey: string) => string, innerClassName?: string }} props
 */
export function WholesaleTrustStrip({ pageDir, getCopy, innerClassName }) {
  const { t } = useTranslation()
  const c = getCopy ?? ((field, key) => t(key))
  return (
    <section dir={pageDir} className="border-b border-border/60 bg-background px-4 py-8 sm:px-6">
      <div className={cn("mx-auto", innerClassName || "max-w-5xl")}>
        <h2 className="text-center text-lg font-semibold">{c("trust_title", "wholesale.market.trust.title")}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <li
                key={item.key}
                className="flex gap-3 rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm sm:flex-col sm:items-center sm:text-center"
              >
                <Icon className="size-8 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c(item.titleField, item.titleKey)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{c(item.bodyField, item.bodyKey)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
