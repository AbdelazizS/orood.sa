import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { MessageSquare, Phone } from "lucide-react"
import { ContactDialog } from "@/components/chat/ContactDialog"
import { useAuthStore } from "@/store/useAuthStore"

/**
 * ContactBar — Sticky bottom bar on mobile for Chat + Call.
 */
export function ContactBar({ product }) {
  const { t } = useTranslation()
  const { user, token } = useAuthStore()
  const isOwner = token && user?.id === product?.seller?.id
  const contactPhone = product?.contact_preferences?.phone ?? true
  const contactMessages = product?.contact_preferences?.messages ?? true
  const phoneNumber = product?.contact_preferences?.phone_number ?? product?.seller?.phone

  if (isOwner) return null

  return (
    <div className="fixed bottom-0 start-0 end-0 z-40 flex gap-2 border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
      {contactMessages && (
        <ContactDialog
          productId={product.id}
          productTitle={product.title}
          trigger={
            <Button className="flex-1 gap-2 py-6 text-base font-semibold shadow-lg">
              <MessageSquare className="size-5" />
              {t("feed.contactNow")}
            </Button>
          }
        />
      )}
      {contactPhone && phoneNumber && (
        <a
          href={`tel:${phoneNumber}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-primary py-3.5 font-semibold text-primary"
        >
          <Phone className="size-5" />
          {t("addOffer.contactPhone")}
        </a>
      )}
    </div>
  )
}
