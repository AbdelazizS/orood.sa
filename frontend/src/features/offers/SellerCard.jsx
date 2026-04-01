import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MapPin, Clock, MessageSquare, Phone, Pencil } from "lucide-react"
import { VerificationBadge } from "@/components/auth/VerificationBadge"
import { ContactDialog } from "@/components/chat/ContactDialog"
import { useAuthStore } from "@/store/useAuthStore"

export function SellerCard({ product }) {
  const { t } = useTranslation()
  const { user, token } = useAuthStore()
  const seller = product?.seller
  const isOwner = token && user?.id === seller?.id
  const contactPhone = product?.contact_preferences?.phone ?? true
  const contactMessages = product?.contact_preferences?.messages ?? true
  const phoneNumber = product?.contact_preferences?.phone_number ?? seller?.phone

  if (!seller) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            {seller.avatar_url ? (
              <img src={seller.avatar_url} alt="" className="size-full object-cover" />
            ) : null}
            <AvatarFallback className="text-lg">
              {seller.name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                to={`/users/${seller.id}`}
                className="font-semibold hover:underline truncate"
              >
                {seller.name}
              </Link>
              <VerificationBadge
                emailVerified={seller.email_verified ?? seller.is_verified}
                size="sm"
              />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {seller.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {seller.city.name}
                </span>
              )}
              {seller.last_seen && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {seller.last_seen}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isOwner ? (
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link to={`/products/${product.id}/edit`}>
              <Pencil className="me-2 size-4" />
              {t("addOffer.editTitle", "Edit Listing")}
            </Link>
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            {contactMessages && (
              <ContactDialog
                productId={product.id}
                productTitle={product.title}
                trigger={
                  <Button className="w-full">
                    <MessageSquare className="me-2 size-4" />
                    {t("feed.contactNow")}
                  </Button>
                }
              />
            )}
            {contactPhone && phoneNumber && (
              <Button variant="outline" size="sm" asChild className="w-full">
                <a href={`tel:${phoneNumber}`}>
                  <Phone className="me-2 size-4" />
                  {t("addOffer.contactPhone")}
                </a>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild className="w-full">
              <Link to={`/users/${seller.id}`}>
                {t("productDetails.viewProfile", "View Profile")}
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
