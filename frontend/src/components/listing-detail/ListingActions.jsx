import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Button } from "@/components/ui/button"
import { ContactDialog } from "@/components/chat/ContactDialog"
import { useAuthStore } from "@/store/useAuthStore"
import { Phone, MessageCircle, MapPin } from "lucide-react"
import { ViewAtLocationModal } from "./ViewAtLocationModal"
import { Separator } from "@/components/ui/separator"

import { isRealEstateListing } from "@/lib/listings/isRealEstateListing"

/**
 * Section 7 — Action Buttons Row.
 * Horizontal scrollable. Communication | View at location | Buy now
 */
export function ListingActions({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const { user, token } = useAuthStore()
  const [viewModalOpen, setViewModalOpen] = useState(false)

  const isOwner = token && (user?.id === product?.seller?.id || user?.id === product?.user_id)
  const phoneNumber = product?.contact_preferences?.phone_number ?? product?.seller?.phone
  const canCall = Boolean(product?.contact_by_call && phoneNumber)
  const canMessage = product?.contact_preferences?.messages !== false
  const isRE = isRealEstateListing(product)
  const viewAtLocation = !isRE && (product?.view_at_location ?? product?.shipping_details?.view_at_client ?? false)
  const hasPrice = product?.price != null && product?.price > 0
  const isBuyableOffer =
    !isRE && hasPrice && (product?.type === "offer" || product?.is_offer === true)

  if (isOwner) return null

  return (
    <>
      <div
        dir={direction}
        className="flex flex-wrap items-center gap-2 px-4 py-4 sm:px-6"
      >
        {canMessage && (
          <ContactDialog
            productId={product?.id}
            productTitle={product?.title}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 border-primary text-primary min-h-[44px]"
              >
                {canMessage ? <MessageCircle className="size-[14px]" /> : <Phone className="size-[14px]" />}
                {canMessage ? t("listingDetail.messageMe", "راسلني") : t("listingDetail.callMe", "Call me")}
              </Button>
            }
          />
        )}
        {canCall && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 border-primary text-primary min-h-[44px]"
            asChild
          >
            <a href={`tel:${phoneNumber}`}>
              <Phone className="size-[14px]" />
              {phoneNumber}
            </a>
          </Button>
        )}
        {viewAtLocation && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => setViewModalOpen(true)}
          >
            <MapPin className="size-[14px]" />
            {t("purchase.viewAtLocation", "أرغب بمشاهدة المنتج في موقعي")}
          </Button>
        )}
        {isBuyableOffer && (
          <Button size="sm" className="shrink-0 gap-1.5" asChild>
            {token ? (
              <Link to={`/products/${product.id}/purchase`}>
                {t("purchase.buyNow", "اشتر الآن")}
              </Link>
            ) : (
              <Link to="/login" state={{ redirectTo: `/products/${product.id}/purchase` }}>
                {t("purchase.loginToBuy", "Sign in to buy")}
              </Link>
            )}
          </Button>
        )}
      </div>
      <Separator />
      <ViewAtLocationModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        productId={product?.id}
      />
    </>
  )
}
