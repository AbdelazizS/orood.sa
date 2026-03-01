import { useTranslation } from "react-i18next"
import { Shield, CheckCircle2 } from "lucide-react"

/**
 * كن مطمئن — Platform guarantees (always visible at bottom).
 */
export function TrustGuarantees() {
  const { t } = useTranslation()

  const items = [
    { key: "verified", label: t("productDetails.guaranteeVerified", "حسابات بائعين موثقة") },
    { key: "refund", label: t("productDetails.guaranteeRefund", "استرداد في حال عدم الاستلام أو عدم المطابقة") },
    { key: "secure", label: t("productDetails.guaranteeSecure", "قنوات دفع آمنة (ضمان أو COD)") },
    { key: "shipping", label: t("productDetails.guaranteeShipping", "شحن سريع") },
    { key: "support", label: t("productDetails.guaranteeSupport", "دعم عملاء 24/7") },
  ]

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="size-6 text-primary" />
        <h2 className="text-lg font-bold text-primary">
          {t("purchase.trustMessage", "كن مطمئن")}
        </h2>
      </div>
      <ul className="space-y-2">
        {items.map(({ key, label }) => (
          <li key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 shrink-0 text-primary" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
