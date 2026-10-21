import { Link, useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { openSupportConversation } from "@/services/subscriberService"
import { SubscriberPageHeader } from "@/components/subscriber/SubscriberPageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, Headset, Loader2, MessageSquareText } from "lucide-react"

/**
 * Contact the Arooth team: a direct chat (in the subscriber's inbox and /admin/messages),
 * plus shortcuts for the two usual reasons — credits and a specific property.
 */
export function SubscriberSupportPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const openChat = useMutation({
    mutationFn: openSupportConversation,
    onSuccess: (conversationId) => navigate(`/subscriber/messages?c=${conversationId}`),
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.errorGeneric", "حدث خطأ")),
  })

  return (
    <div className="space-y-6">
      <SubscriberPageHeader
        title={t("subscriber.nav.support", "تواصل مع الإدارة")}
        subtitle={t("subscriber.support.subtitle", "فريق عروض يرد عليك من لوحة الإدارة، وتصلك الردود في الرسائل والإشعارات.")}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Headset className="size-5 text-primary" aria-hidden />
              {t("subscriber.support.chatTitle", "محادثة مع الإدارة")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t("subscriber.support.chatBody", "لأي استفسار عام عن حسابك أو طريقة العمل.")}</p>
            <Button className="w-full gap-2" onClick={() => openChat.mutate()} disabled={openChat.isPending}>
              {openChat.isPending ? <Loader2 className="size-4 animate-spin" /> : <MessageSquareText className="size-4" aria-hidden />}
              {t("subscriber.support.open", "فتح محادثة مع الإدارة")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="size-5 text-primary" aria-hidden />
              {t("subscriber.credits.request", "طلب رصيد")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t("subscriber.support.creditsBody", "لشراء باقة إعلانات جديدة أرسل طلب رصيد، وتضيفه الإدارة بعد الدفع.")}</p>
            <Button className="w-full" variant="outline" asChild>
              <Link to="/subscriber/credits">{t("subscriber.credits.request", "طلب رصيد")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareText className="size-5 text-primary" aria-hidden />
              {t("subscriber.support.listingTitle", "عن عقار اشتريت إعلانه")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t("subscriber.support.listingBody", "اكتب في «متابعة التسويق» تحت العقار نفسه حتى يبقى كل شيء عنه في مكان واحد.")}</p>
            <Button className="w-full" variant="outline" asChild>
              <Link to="/subscriber/my-listings">{t("subscriber.tabs.mine", "عروضي")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
