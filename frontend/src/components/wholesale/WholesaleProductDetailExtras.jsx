import * as React from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

function Item({ titleKey, bodyKey, defaultOpen = false, className }) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("rounded-2xl border border-border/70 bg-card/40", className)}>
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-4 text-start text-sm font-semibold sm:px-5">
        <span>{t(titleKey)}</span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border/60 px-4 pb-4 pt-0 text-sm leading-relaxed text-muted-foreground sm:px-5">
        <p className="whitespace-pre-line pt-3">{t(bodyKey)}</p>
      </CollapsibleContent>
    </Collapsible>
  )
}

/**
 * Wholesale-specific disclosure blocks (terms, participation, FAQ) — calm, scannable.
 */
export function WholesaleProductDetailExtras({ className }) {
  const { t } = useTranslation()

  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="text-base font-semibold tracking-tight text-foreground">
        {t("wholesale.pdp.extrasTitle")}
      </h2>
      <Item titleKey="wholesale.pdp.shippingTitle" bodyKey="wholesale.pdp.shippingBody" />
      <Item titleKey="wholesale.pdp.termsTitle" bodyKey="wholesale.pdp.termsBody" />
      <Item titleKey="wholesale.pdp.rulesTitle" bodyKey="wholesale.pdp.rulesBody" />
      <Item titleKey="wholesale.pdp.faqTitle" bodyKey="wholesale.pdp.faqBody" />
    </div>
  )
}
