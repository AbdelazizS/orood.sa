import { useTranslation } from "react-i18next"
import { Share2, ShoppingCart, Users } from "lucide-react"

const steps = [
  { key: "reserve", icon: Users },
  { key: "share", icon: Share2 },
  { key: "checkout", icon: ShoppingCart },
]

const stepCopyFields = [
  ["how_step1_label", "how_step1_title", "how_step1_body"],
  ["how_step2_label", "how_step2_title", "how_step2_body"],
  ["how_step3_label", "how_step3_title", "how_step3_body"],
]

/**
 * @param {{ pageDir: string, getCopy?: (field: string, fallbackKey: string) => string }} props
 */
export function WholesaleHowItWorks({ pageDir, getCopy }) {
  const { t } = useTranslation()
  const c = getCopy ?? ((field, key) => t(key))
  return (
    <section id="wholesale-how" dir={pageDir} className="scroll-mt-24 border-b border-border/60 bg-muted/20 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-lg font-semibold sm:text-xl">{c("how_title", "wholesale.market.how.title")}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
          {c("how_lead", "wholesale.market.how.lead")}
        </p>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon
            const [labelField, titleField, bodyField] = stepCopyFields[i]
            return (
              <li
                key={step.key}
                className="flex flex-col items-center rounded-2xl border border-border/80 bg-card p-6 text-center shadow-sm"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="mt-3 text-xs font-medium text-muted-foreground">
                  {c(labelField, `wholesale.market.how.step${i + 1}Label`)}
                </span>
                <span className="mt-1 text-sm font-semibold">{c(titleField, `wholesale.market.how.step${i + 1}Title`)}</span>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c(bodyField, `wholesale.market.how.step${i + 1}Body`)}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
