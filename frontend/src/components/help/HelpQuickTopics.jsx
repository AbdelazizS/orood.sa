import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { Wallet, Package, Shield, MessageCircle, MapPin, ShoppingBag } from "lucide-react"

const TOPICS = [
  { key: "orders", to: "/dashboard/orders", icon: ShoppingBag },
  { key: "wallet", to: "/dashboard/wallet", icon: Wallet },
  { key: "listings", to: "/dashboard/listings", icon: Package },
  { key: "guarantee", to: "/dashboard/wallet?tab=guarantee", icon: Shield },
  { key: "contact", to: "/contact", icon: MessageCircle, external: true },
  { key: "map", to: "/map", icon: MapPin, external: true },
]

export function HelpQuickTopics() {
  const { t } = useTranslation()

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("help.quickTopicsTitle", "Browse by topic")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map(({ key, to, icon: Icon, external }) => (
          <Card key={key} className="transition-colors hover:border-primary/30 hover:bg-muted/20">
            <Link to={to} target={external ? undefined : undefined} className="block h-full">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium text-sm">{t(`help.topics.${key}.title`)}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(`help.topics.${key}.desc`)}</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </section>
  )
}
