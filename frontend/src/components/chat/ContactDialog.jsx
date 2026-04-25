import { cloneElement, isValidElement } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { useAuthStore } from "@/store/useAuthStore"

export function ContactDialog({ productId, productTitle, trigger }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuthStore()

  const redirectAfterLogin = `${location.pathname}${location.search}`

  const requireAuth = () => {
    toast.info(t("messages.loginToContact", "Sign in to message the seller."))
    navigate("/login", { state: { redirectTo: redirectAfterLogin } })
  }

  const openMessagesForProduct = () => {
    if (!productId) return
    navigate(`/dashboard/messages?product=${productId}`)
  }

  const defaultTrigger = (
    <Button type="button" className="w-full">
      <MessageSquare className="me-2 size-4" />
      {t("feed.contactNow")}
    </Button>
  )

  const triggerEl = trigger ?? defaultTrigger

  if (!token) {
    const guestTrigger = isValidElement(triggerEl)
      ? cloneElement(triggerEl, {
          type: "button",
          onClick: (e) => {
            triggerEl.props.onClick?.(e)
            if (!e.defaultPrevented) requireAuth()
          },
        })
      : (
        <Button type="button" className="w-full" onClick={requireAuth}>
          <MessageSquare className="me-2 size-4" />
          {t("feed.contactNow")}
        </Button>
        )
    return guestTrigger
  }

  if (isValidElement(triggerEl)) {
    return cloneElement(triggerEl, {
      type: "button",
      onClick: (e) => {
        triggerEl.props.onClick?.(e)
        if (!e.defaultPrevented) openMessagesForProduct()
      },
      title: productTitle || triggerEl.props.title,
    })
  }

  return (
    <Button type="button" className="w-full" onClick={openMessagesForProduct} title={productTitle || undefined}>
      <MessageSquare className="me-2 size-4" />
      {t("feed.contactNow")}
    </Button>
  )
}
