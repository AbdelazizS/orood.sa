import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { CreditCard, Landmark, Lock, Smartphone, ShieldCheck } from "lucide-react"

/**
 * Footer — PDF design: brand, categories, quick links, language.
 */
export function Footer() {
  const { t } = useTranslation()
  const appStores = [
    { key: "googlePlay", label: t("footer.enterprise.app.stores.googlePlay") },
    { key: "appStore", label: t("footer.enterprise.app.stores.appStore") },
  ]

  const StoreIcon = ({ storeKey }) => {
    if (storeKey === "googlePlay") {
      return (
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path fill="currentColor" d="M3.5 2.6c-.3.3-.5.8-.5 1.4v16c0 .6.2 1.1.5 1.4l9.2-9.4L3.5 2.6zm11.3 7.3L6 3.8l7.7 7.8 1.1-1.7zm1.8 1.8-1.3.9 1.3 1.3 3.5-2c.7-.4.7-1.5 0-1.9l-3.5-2-1.3 1.3 1.3.9c.4.3.4.9 0 1.2zm-2.9 1.5L6 20.2l8.8-6.1-1.1-1z" />
        </svg>
      )
    }

    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="currentColor" d="M16.6 13c0-2.1 1.7-3.1 1.8-3.1-1-1.5-2.5-1.7-3-1.7-1.3-.1-2.5.8-3.2.8-.7 0-1.7-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.9 1.1 9.1.7 1.1 1.5 2.3 2.7 2.2 1.1 0 1.5-.7 2.9-.7s1.8.7 2.9.7c1.2 0 2-.9 2.7-2 .8-1.2 1.1-2.4 1.1-2.5 0 0-2.1-.8-2.1-4.2zM14.5 7c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.8 1 .1 2-.5 2.7-1.3z" />
      </svg>
    )
  }

  return (
    <footer className="mt-auto border-t border-border bg-card text-foreground">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">{t("footer.enterprise.platform.title")}</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {t("footer.enterprise.platform.subtitle")}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/wholesale" className="hover:text-foreground transition-colors">{t("footer.enterprise.platform.links.wholesale")}</Link></li>
              <li><Link to="/dashboard/listings" className="hover:text-foreground transition-colors">{t("footer.enterprise.platform.links.myListings")}</Link></li>
              <li><Link to="/contact" className="hover:text-foreground transition-colors">{t("footer.enterprise.platform.links.contact")}</Link></li>
              <li><Link to="/about" className="hover:text-foreground transition-colors">{t("footer.enterprise.platform.links.about")}</Link></li>
              <li><Link to="/blog" className="hover:text-foreground transition-colors">{t("footer.enterprise.platform.links.blog")}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{t("footer.enterprise.quickLinks.title")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground transition-colors">{t("footer.enterprise.quickLinks.links.home")}</Link></li>
              <li><Link to="/" className="hover:text-foreground transition-colors">{t("footer.enterprise.quickLinks.links.categories")}</Link></li>
              <li><Link to="/?filter=offers" className="hover:text-foreground transition-colors">{t("footer.enterprise.quickLinks.links.featured")}</Link></li>
              <li><Link to="/?sort=newest" className="hover:text-foreground transition-colors">{t("footer.enterprise.quickLinks.links.latest")}</Link></li>
              <li><Link to="/" className="hover:text-foreground transition-colors">{t("footer.enterprise.quickLinks.links.more")}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{t("footer.enterprise.customer.title")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/help" className="hover:text-foreground transition-colors">{t("footer.enterprise.customer.links.helpCenter")}</Link></li>
              <li><Link to="/refund-policy" className="hover:text-foreground transition-colors">{t("footer.enterprise.customer.links.refundPolicy")}</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">{t("footer.enterprise.customer.links.terms")}</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">{t("footer.enterprise.customer.links.privacy")}</Link></li>
              <li><Link to="/contact" className="hover:text-foreground transition-colors">{t("footer.enterprise.customer.links.reportIssue")}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{t("footer.enterprise.payment.title")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CreditCard className="size-4" />{t("footer.enterprise.payment.items.cards")}</li>
              <li className="flex items-center gap-2"><Smartphone className="size-4" />{t("footer.enterprise.payment.items.mobileApps")}</li>
              <li className="flex items-center gap-2"><Landmark className="size-4" />{t("footer.enterprise.payment.items.bankTransfer")}</li>
              <li className="flex items-center gap-2"><ShieldCheck className="size-4" />{t("footer.enterprise.payment.items.mada")}</li>
              <li className="flex items-center gap-2"><Lock className="size-4" />{t("footer.enterprise.payment.items.secure")}</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-medium">{t("footer.enterprise.app.title")}</p>
            <div className="flex flex-wrap gap-2">
              {appStores.map((store) => (
                <Button key={store.key} variant="outline" size="sm" disabled className="cursor-not-allowed opacity-80">
                  <StoreIcon storeKey={store.key} />
                  {store.label}
                  <span className="ms-2 text-[11px] text-muted-foreground">({t("footer.enterprise.app.comingSoon")})</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-5 text-center text-sm text-muted-foreground">
          <p className="inline-flex items-center gap-2">
            <span>{t("footer.enterprise.bottom.copyright", { year: new Date().getFullYear() })}</span>
            <span>{t("footer.enterprise.bottom.country")}</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
