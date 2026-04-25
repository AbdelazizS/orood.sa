import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, MessageCircle } from "lucide-react"

const supportEmail =
  (typeof import.meta.env.VITE_SUPPORT_EMAIL === "string" && import.meta.env.VITE_SUPPORT_EMAIL.trim()) ||
  "support@example.com"

/**
 * Minimal help / contact hub for dashboard members.
 */
export function HelpPage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("help.title", "Help & support")}</h1>
        <p className="text-muted-foreground mt-1">{t("help.subtitle", "How to get assistance on the platform.")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="size-5" />
            {t("help.contactTitle", "Contact")}
          </CardTitle>
          <CardDescription>{t("help.contactDesc", "Reach the team by email for account or payment issues.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <a href={`mailto:${supportEmail}`} className="text-primary font-medium hover:underline">
              {supportEmail}
            </a>
          </p>
          <p className="text-muted-foreground">{t("help.contactNote", "Set VITE_SUPPORT_EMAIL in the frontend env for your real support address.")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="size-5" />
            {t("help.faqTitle", "Quick tips")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 ps-5 text-sm text-muted-foreground">
            <li>{t("help.faqOrders", "Track purchases and sales from Order tracking in the side menu.")}</li>
            <li>{t("help.faqWallet", "Top up your wallet from Balance to pay with platform escrow.")}</li>
            <li>{t("help.faqVerify", "Complete verification to build trust with buyers and sellers.")}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
