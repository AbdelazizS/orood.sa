import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ContactDialog } from "@/components/chat/ContactDialog"
import { useAuthStore } from "@/store/useAuthStore"
import apiClient from "@/lib/apiClient"
import { Phone, MessageCircle, MapPin, Loader2 } from "lucide-react"
import { ViewAtLocationModal } from "./ViewAtLocationModal"
import { Separator } from "@/components/ui/separator"

/**
 * Section 7 — Action Buttons Row.
 * Horizontal scrollable. Phone | Message | View at location | Bid stepper | Buy Now
 */
export function ListingActions({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const { user, token } = useAuthStore()
  const queryClient = useQueryClient()
  const [bidAmount, setBidAmount] = useState(
    () => product?.price ?? product?.highest_bid ?? 10
  )
  const [viewModalOpen, setViewModalOpen] = useState(false)

  const isOwner = token && (user?.id === product?.seller?.id || user?.id === product?.user_id)
  const contactPhone = product?.contact_preferences?.phone_number ?? product?.seller?.phone
  const contactByMessage = product?.contact_preferences?.message ?? true
  const viewAtLocation = product?.view_at_location ?? product?.shipping_details?.view_at_client ?? false
  const biddingEnabled = product?.accept_bids ?? false
  const hasPrice = product?.price != null && product?.price > 0

  const placeBidMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/products/${product.id}/bids`, {
        amount: parseFloat(bidAmount) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bids", product.id] })
      queryClient.invalidateQueries({ queryKey: ["product", product.id] })
    },
  })

  const handleBid = () => {
    const amt = parseFloat(bidAmount)
    if (amt > 0) placeBidMutation.mutate()
  }

  if (isOwner) return null

  return (
    <>
      <div
        dir={direction}
        className="flex items-center gap-2 overflow-x-auto px-4 py-4 scrollbar-hide sm:px-6"
      >
        {contactPhone && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 text-sm"
            asChild
          >
            <a href={`tel:${contactPhone}`}>
              <Phone className="size-[14px]" />
              {contactPhone}
            </a>
          </Button>
        )}
        <ContactDialog
          productId={product?.id}
          productTitle={product?.title}
          trigger={
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 border-primary text-primary"
            >
              <MessageCircle className="size-[14px]" />
              {t("listingDetail.messageMe", "راسلني")}
            </Button>
          }
        />
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
        {biddingEnabled && (
          <div className="flex shrink-0 items-center gap-2">
            <Input
              type="text"
              inputMode="decimal"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              className="h-8 w-20 px-2 text-center text-sm"
              dir="ltr"
            />
            <Button
              size="sm"
              className="shrink-0 gap-1"
              onClick={handleBid}
              disabled={!bidAmount || placeBidMutation.isPending}
            >
              {placeBidMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <span className="text-xs">{t("bids.place", "وضع")}</span>
                  <span className="text-xs font-bold">عرض</span>
                </>
              )}
            </Button>
          </div>
        )}
        {hasPrice && (
          <Button size="sm" className="shrink-0 gap-1.5" asChild>
            <Link to={`/products/${product.id}/purchase`}>
              {t("purchase.buyNow", "اشتر الآن")}
            </Link>
          </Button>
        )}
      </div>
      <Separator />
      <ViewAtLocationModal open={viewModalOpen} onOpenChange={setViewModalOpen} />
    </>
  )
}
