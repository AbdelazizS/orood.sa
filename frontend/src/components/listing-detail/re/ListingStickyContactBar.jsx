import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Button } from "@/components/ui/button"
import { ContactDialog } from "@/components/chat/ContactDialog"
import { useAuthStore } from "@/store/useAuthStore"
import { MessageCircle, Phone } from "lucide-react"
import { cn } from "@/lib/utils"

export function ListingStickyContactBar({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const location = useLocation()
  const { user, token } = useAuthStore()

  const isOwner = token && (user?.id === product?.seller?.id || user?.id === product?.user_id)
  if (isOwner) return null

  const phoneNumber = product?.contact_preferences?.phone_number ?? product?.seller?.phone
  const canCall = Boolean(product?.contact_by_call && phoneNumber)
  const canMessage = product?.contact_preferences?.messages !== false
  const loginRedirect = `${location.pathname}${location.search}`

  return (
    <div
      dir={direction}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2">
        {canMessage ? (
          <ContactDialog
            productId={product?.id}
            productTitle={product?.title}
            trigger={
              <Button
                type="button"
                variant="outline"
                className="h-11 min-h-11 shrink-0 gap-1.5 rounded-lg border-border px-3 text-sm font-medium"
              >
                <MessageCircle className="size-4 shrink-0" aria-hidden />
                <span className="hidden xs:inline">{t("listingDetail.re.myMessages", "رسائلي")}</span>
                <span className="xs:hidden">{t("listingDetail.messageMe", "راسلني")}</span>
              </Button>
            }
          />
        ) : null}

        {canCall ? (
          <Button
            variant="outline"
            className="h-11 min-h-11 min-w-0 flex-1 gap-1.5 rounded-lg border-border px-2 text-sm font-medium"
            asChild
          >
            <a href={`tel:${phoneNumber}`} className="flex items-center justify-center gap-1.5">
              <Phone className="size-4 shrink-0" aria-hidden />
              <span className="truncate tabular-nums" dir="ltr">
                {phoneNumber}
              </span>
            </a>
          </Button>
        ) : (
          <div className="flex-1" />
        )}

        {token ? (
          canMessage ? (
            <Button
              className={cn(
                "h-11 min-h-11 flex-[1.4] rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700",
              )}
              asChild
            >
              <Link to={`/dashboard/messages?product=${product?.id}`}>
                {t("listingDetail.re.contactSeller", "تواصل مع البائع")}
              </Link>
            </Button>
          ) : null
        ) : (
          <Button
            className="h-11 min-h-11 flex-[1.4] rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700"
            asChild
          >
            <Link to="/login" state={{ redirectTo: loginRedirect }}>
              {t("listingDetail.re.loginToBuy", "سجل للدخول للشراء")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
