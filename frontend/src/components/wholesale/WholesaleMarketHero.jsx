import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

/**
 * @param {{ pageDir: string, getCopy?: (field: string, fallbackKey: string) => string }} props
 */
export function WholesaleMarketHero({ pageDir, getCopy }) {
  const { t } = useTranslation()
  const c = getCopy ?? ((field, key) => t(key))
  return (
    <div
      dir={pageDir}
      className="border-b border-border/60 bg-gradient-to-b from-muted/40 to-background px-4 py-8 sm:px-6 sm:py-10"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {c("hero_kicker", "wholesale.market.hero.kicker")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {c("hero_title", "wholesale.market.hero.title")}
        </h1>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          {c("hero_subtitle", "wholesale.market.hero.subtitle")}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="default" size="lg" className="rounded-full px-6">
            <a href="#wholesale-products">{c("hero_cta_browse", "wholesale.market.hero.ctaBrowse")}</a>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full px-6">
            <a href="#wholesale-how">{c("hero_cta_how", "wholesale.market.hero.ctaHow")}</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
