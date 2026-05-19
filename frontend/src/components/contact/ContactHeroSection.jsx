import { Badge } from "@/components/ui/badge"
import { Clock, Headphones, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { PAGE_HERO_BLEED_CLASS } from "@/lib/pageLayout"

const ICON_MAP = {
  shield: Shield,
  headset: Headphones,
  clock: Clock,
}

export function ContactHeroSection({ page }) {
  if (!page) return null

  return (
    <section className={cn(PAGE_HERO_BLEED_CLASS, "py-8 md:py-10")}>
      <div className="w-full space-y-4 text-start">
        {page.hero_kicker ? (
          <p className="text-sm font-medium text-primary">{page.hero_kicker}</p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">{page.hero_title}</h1>
        {page.hero_subtitle ? (
          <p className="text-base leading-relaxed text-muted-foreground">{page.hero_subtitle}</p>
        ) : null}
        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-4">
          {page.hours ? <span>{page.hours}</span> : null}
          {page.response_time ? <span>{page.response_time}</span> : null}
        </div>
        {(page.trust_indicators ?? []).length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {page.trust_indicators.map((item) => {
              const Icon = ICON_MAP[item.icon] ?? Shield
              return (
                <Badge key={item.key || item.label} variant="secondary" className="gap-1.5 px-3 py-1 font-normal">
                  <Icon className="size-3.5" aria-hidden />
                  {item.label}
                </Badge>
              )
            })}
          </div>
        ) : null}
      </div>
    </section>
  )
}
