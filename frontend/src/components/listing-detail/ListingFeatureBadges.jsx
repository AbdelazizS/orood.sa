import { useTranslation } from "react-i18next"
import { Check, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"

/**
 * Section 7: Feature badges — free shipping, free return, view at location.
 * Only enabled features, Badge variant="outline".
 */
export function ListingFeatureBadges({ product }) {
  const { t } = useTranslation()
  const sd = product?.shipping_details ?? {}
  const freeShipping = product?.free_shipping ?? sd.free_shipping ?? false
  const freeReturn = product?.free_return ?? sd.free_return ?? false
  const viewAtClient = sd.view_at_client ?? product?.view_at_client ?? false

  const badges = []
  if (freeShipping) badges.push({ key: "shipping", label: t("listingDetail.freeShipping", "الشحن مجاناً"), icon: Check })
  if (freeReturn) badges.push({ key: "return", label: t("listingDetail.freeReturn", "والاسترجاع الفوري مجاناً"), icon: Check })
  if (viewAtClient) badges.push({ key: "view", label: t("listingDetail.viewAtLocation", "مشاهدة المنتج في الموقع"), icon: MapPin })

  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 border-b border-border bg-card px-6 py-4">
      {badges.map(({ key, label, icon: Icon }) => (
        <Badge key={key} variant="outline" className="gap-1.5 px-2.5 py-1">
          <Icon className="size-3.5 text-primary" />
          {label}
        </Badge>
      ))}
    </div>
  )
}
