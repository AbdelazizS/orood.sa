import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { MessageSquare, Phone, Gavel, ShoppingCart, MapPin } from "lucide-react"
import { ContactDialog } from "@/components/chat/ContactDialog"
import { ShareButton } from "@/components/share/ShareButton"
import { useAuthStore } from "@/store/useAuthStore"
import apiClient from "@/lib/apiClient"

const formatPrice = (price, t) => {
  if (price === null || price === undefined) return null
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * ProductPriceCard — Price + Bidding status + Contact CTAs.
 * Handles Offer vs Request, fixed price, no price, bidding (وصل السوم).
 */
export function ProductPriceCard({ product }) {
  const { t } = useTranslation()
  const { user, token } = useAuthStore()

  const { data: bidsRaw = [] } = useQuery({
    queryKey: ["bids", product?.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/products/${product.id}/bids`)
      return data?.data ?? []
    },
    enabled: Boolean(product?.id && product?.accept_bids),
  })

  const highestBid = bidsRaw
    .filter((b) => b.amount != null)
    .reduce((best, b) => (!best || b.amount > best.amount ? b : best), null)
  const isRequest = product?.type === "request"
  const isOwner = token && user?.id === product?.seller?.id
  const hasPrice = product?.price != null && product?.price > 0
  const acceptBids = product?.accept_bids ?? false
  const bidsVisible = product?.bids_visible ?? true
  const contactPhone = product?.contact_preferences?.phone ?? true
  const contactMessages = product?.contact_preferences?.messages ?? true
  const phoneNumber = product?.contact_preferences?.phone_number ?? product?.seller?.phone

  const showHighestBid = acceptBids && bidsVisible && highestBid?.amount != null

  return (
    <Card className="overflow-hidden shadow-md transition-shadow duration-200 hover:shadow-lg">
      <CardContent className="p-6 space-y-4">
        {/* Price / Bidding display */}
        <div className="space-y-2">
          {isRequest ? (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("productDetails.budgetLabel", "Budget (optional)")}
              </p>
              <p className="text-2xl font-bold">
                {hasPrice ? formatPrice(product.price, t) : t("productDetails.openForOffers", "Open for offers")}
              </p>
            </div>
          ) : (
            <div>
              {hasPrice ? (
                <p className="text-3xl font-bold text-primary">
                  {formatPrice(product.price, t)}
                </p>
              ) : showHighestBid ? (
                <p className="text-2xl font-bold text-primary">
                  {t("bids.highestBid", "وصل السوم")}: {formatPrice(highestBid.amount, t)}
                </p>
              ) : acceptBids ? (
                <p className="text-xl font-semibold text-muted-foreground">
                  {t("productDetails.openForOffers", "Open for offers")}
                </p>
              ) : (
                <p className="text-xl font-semibold text-muted-foreground">
                  {t("feed.priceOnRequest")}
                </p>
              )}
            </div>
          )}

          {acceptBids && !bidsVisible && !isOwner && (
            <Badge variant="secondary" className="gap-1">
              <Gavel className="size-3.5" />
              {t("bids.biddingActive", "Bidding active")}
            </Badge>
          )}

          {product?.is_wholesale && product?.wholesale_price != null && (
            <p className="text-sm text-muted-foreground">
              {t("wholesale.title")}: {formatPrice(product.wholesale_price, t)}
              {product.min_quantity ? ` (${t("wholesale.minQuantity")} ${product.min_quantity})` : ""}
            </p>
          )}
        </div>

        {/* Actions */}
        {!isOwner && (
          <div className="flex flex-col gap-2">
            {isRequest ? null : hasPrice && (
              <Button asChild className="w-full gap-2 py-6 text-base font-semibold">
                <Link to={`/products/${product.id}/purchase`}>
                  <ShoppingCart className="size-5" />
                  {t("purchase.buyNow", "اشتر الآن")}
                </Link>
              </Button>
            )}
            {contactMessages && (
              <ContactDialog
                productId={product.id}
                productTitle={product.title}
                trigger={
                  <Button className="w-full gap-2 py-6 text-base font-semibold">
                    <MessageSquare className="size-5" />
                    {t("feed.contactNow")}
                  </Button>
                }
              />
            )}
            {product?.shipping_details?.view_at_client && (
              <Button variant="outline" className="w-full gap-2" asChild>
                <a href={`https://www.google.com/maps/search/?api=1`} target="_blank" rel="noopener noreferrer">
                  <MapPin className="size-5" />
                  {t("purchase.viewAtLocation", "ارغب بمشاهدة المنتج في موقعي")}
                </a>
              </Button>
            )}
            {contactPhone && phoneNumber && (
              <a
                href={`tel:${phoneNumber}`}
                className="flex items-center justify-center gap-2 rounded-lg border border-primary px-4 py-3 font-semibold text-primary transition-colors hover:bg-primary/5"
              >
                <Phone className="size-5" />
                {t("addOffer.contactPhone")}
              </a>
            )}
            <div className="pt-2">
              <ShareButton product={product} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
