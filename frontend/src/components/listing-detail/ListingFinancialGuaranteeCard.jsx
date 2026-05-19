import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Landmark } from "lucide-react"

/** Seller trust badges only (payout verified, financial guarantee). Listing schema attrs use ListingAttributesGrid. */
export function ListingFinancialGuaranteeCard({ product }) {
  const { t } = useTranslation()
  const badges = product?.seller_financial_badges ?? []

  if (!badges.length) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="size-4 text-primary" />
          {t("listingDetail.sellerTrustBadges")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <Badge key={b.code} variant="secondary" className="gap-1">
              {b.code === "payout_verified" ? <Landmark className="size-3" /> : <Shield className="size-3" />}
              {b.label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
