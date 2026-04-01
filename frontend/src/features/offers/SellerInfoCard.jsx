import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MapPin, Clock, Package } from "lucide-react"
import { VerificationBadge } from "@/components/auth/VerificationBadge"
import { resolveImageUrl } from "@/lib/imageUrl"

/**
 * Seller info: city, online status, completed requests, verification.
 */
export function SellerInfoCard({ product }) {
  const { t } = useTranslation()
  const seller = product?.seller
  if (!seller) return null

  const cityName = seller.city?.name ?? product?.location
  const lastSeen = seller.last_seen ?? t("productDetails.onlineNow", "متصل الآن")
  const completedOrders = seller.completed_orders ?? 0

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-14">
            {seller.avatar_url ? (
              <img src={resolveImageUrl(seller.avatar_url)} alt="" className="size-full object-cover" />
            ) : null}
            <AvatarFallback className="text-xl">
              {seller.name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Link
              to={`/users/${seller.id}`}
              className="font-semibold hover:underline truncate block"
            >
              {seller.name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {cityName && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {cityName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {lastSeen}
              </span>
              <span className="flex items-center gap-1">
                <Package className="size-3.5" />
                {t("productDetails.completedRequests", "الطلبات المكتملة")}: {completedOrders}
              </span>
            </div>
            <div className="mt-2">
              <VerificationBadge
                emailVerified={seller.email_verified ?? seller.is_verified}
                size="sm"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
