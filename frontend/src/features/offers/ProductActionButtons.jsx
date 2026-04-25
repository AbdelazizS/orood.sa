import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { MessageSquare, Phone, ShoppingCart, Gavel, MapPin } from "lucide-react"
import { ContactDialog } from "@/components/chat/ContactDialog"
import { ShareButton } from "@/components/share/ShareButton"
import { useAuthStore } from "@/store/useAuthStore"

/**
 * Stacked interaction buttons: Buy Now, Make Offer, Chat, Phone, View at location, Share, Report.
 */
export function ProductActionButtons({ product }) {
  const { t } = useTranslation()
  const { user, token } = useAuthStore()
  const isOwner = token && user?.id === product?.seller?.id
  const isRequest = product?.type === "request"
  const hasPrice = product?.price != null && product?.price > 0
  const acceptBids = product?.accept_bids ?? false
  const contactPhone = product?.contact_preferences?.phone ?? true
  const contactMessages = product?.contact_preferences?.messages ?? true
  const phoneNumber = product?.contact_preferences?.phone_number ?? product?.seller?.phone
  const viewAtClient = product?.shipping_details?.view_at_client ?? false

  if (isOwner) return null

  return (
    <div className="flex flex-col gap-2">
      {!isRequest && hasPrice && (
        <Button asChild size="lg" className="w-full gap-2 py-6 text-base font-semibold">
          {token ? (
            <Link to={`/products/${product.id}/purchase`} className="flex items-center justify-center gap-2">
              <ShoppingCart className="size-5" />
              {t("purchase.buyNow", "اشتر الآن")}
            </Link>
          ) : (
            <Link
              to="/login"
              state={{ redirectTo: `/products/${product.id}/purchase` }}
              className="flex items-center justify-center gap-2"
            >
              <ShoppingCart className="size-5" />
              {t("purchase.loginToBuy", "Sign in to buy")}
            </Link>
          )}
        </Button>
      )}
      {acceptBids && (
        <Button asChild variant="outline" size="lg" className="w-full gap-2 py-5">
          <a href="#bids-section">
            <Gavel className="size-5" />
            {t("bids.place", "ضع سعر")}
          </a>
        </Button>
      )}
      {contactMessages && (
        <ContactDialog
          productId={product.id}
          productTitle={product.title}
          trigger={
            <Button variant="outline" size="lg" className="w-full gap-2 py-5">
              <MessageSquare className="size-5" />
              {t("feed.contactNow", "راسلني")}
            </Button>
          }
        />
      )}
      {contactPhone && phoneNumber && (
        <Button variant="outline" size="lg" className="w-full gap-2 py-5" asChild>
          <a href={`tel:${phoneNumber}`}>
            <Phone className="size-5" />
            {t("addOffer.contactPhone", "اتصال")}
          </a>
        </Button>
      )}
      {viewAtClient && (
        <Button variant="outline" size="lg" className="w-full gap-2 py-5" asChild>
          <a href={`https://www.google.com/maps/search/?api=1`} target="_blank" rel="noopener noreferrer">
            <MapPin className="size-5" />
            {t("purchase.viewAtLocation", "أرغب بمشاهدة المنتج في موقعي")}
          </a>
        </Button>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <ShareButton product={product} />
        <Button variant="outline" size="sm">
          {t("common.report")}
        </Button>
      </div>
    </div>
  )
}
