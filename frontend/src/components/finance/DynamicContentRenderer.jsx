import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Mail, Phone, MessageCircle } from "lucide-react"

const ICONS = { email: Mail, phone: Phone, whatsapp: MessageCircle, telegram: MessageCircle }

function isPlaceholderEmail(value) {
  if (!value || typeof value !== "string") return true
  return value.includes("example.com")
}

export function DynamicContentRenderer({
  blocks = [],
  support,
  contacts = [],
  showContactCard = true,
}) {
  const { i18n } = useTranslation()
  const locale = i18n.language?.startsWith("en") ? "en" : "ar"

  const safeContacts = contacts.filter((c) => c.value && !isPlaceholderEmail(c.value))
  const supportEmail = support?.email && !isPlaceholderEmail(support.email) ? support.email : null

  return (
    <div className="space-y-6">
      {blocks.map((block) => {
        const cfg = block.config?.[locale] ? { ...block.config, ...block.config[locale] } : block.config ?? {}

        if (block.block_type === "hero") {
          return (
            <header key={block.id} className="space-y-2 rounded-xl border border-border bg-card p-6 md:p-8">
              <h2 className="text-xl font-bold md:text-2xl">{cfg.title}</h2>
              {cfg.subtitle ? <p className="text-muted-foreground leading-relaxed">{cfg.subtitle}</p> : null}
            </header>
          )
        }

        if (block.block_type === "warning") {
          return (
            <Card key={block.id} className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              <CardContent className="pt-6 text-sm leading-relaxed">{cfg.body ?? cfg.text}</CardContent>
            </Card>
          )
        }

        if (block.block_type === "info_card" || block.block_type === "info") {
          return (
            <Card key={block.id}>
              <CardHeader>
                <CardTitle className="text-lg">{cfg.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {cfg.body ?? cfg.text}
              </CardContent>
            </Card>
          )
        }

        if (block.block_type === "faq") {
          const items = (cfg.items ?? []).filter((item) => {
            const q = locale === "en" ? item.question_en ?? item.question_ar : item.question_ar ?? item.question_en
            return Boolean(q?.trim())
          })
          if (!items.length) return null

          return (
            <Card key={block.id}>
              <CardHeader>
                <CardTitle className="text-lg">{cfg.title ?? (locale === "en" ? "FAQ" : "أسئلة شائعة")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {items.map((item, i) => (
                    <AccordionItem key={i} value={`faq-${block.id}-${i}`}>
                      <AccordionTrigger className="min-h-11 text-start text-sm font-medium">
                        {locale === "en" ? item.question_en ?? item.question_ar : item.question_ar ?? item.question_en}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {locale === "en" ? item.answer_en ?? item.answer_ar : item.answer_ar ?? item.answer_en}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )
        }

        if (block.block_type === "onboarding_steps") {
          const steps = cfg.steps ?? []
          if (!steps.length) return null

          return (
            <Card key={block.id}>
              {cfg.title ? (
                <CardHeader>
                  <CardTitle className="text-lg">{cfg.title}</CardTitle>
                </CardHeader>
              ) : null}
              <CardContent className={cfg.title ? "" : "pt-6"}>
                <ol className="list-decimal space-y-3 ps-5 text-sm text-muted-foreground leading-relaxed">
                  {steps.map((step, i) => (
                    <li key={i}>{typeof step === "string" ? step : step[locale] ?? step.ar ?? step.en}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )
        }

        return null
      })}

      {showContactCard && (safeContacts.length > 0 || supportEmail) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{locale === "en" ? "Direct contact" : "تواصل مباشر"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`} className="inline-flex items-center gap-2 font-medium text-primary hover:underline">
                <Mail className="size-4" />
                {supportEmail}
              </a>
            ) : null}
            {support?.hours ? <p className="text-muted-foreground">{support.hours}</p> : null}
            {safeContacts.map((c) => {
              const Icon = ICONS[c.type] ?? Mail
              const href =
                c.type === "email"
                  ? `mailto:${c.value}`
                  : c.type === "phone"
                    ? `tel:${c.value}`
                    : c.type === "whatsapp"
                      ? `https://wa.me/${c.value.replace(/\D/g, "")}`
                      : null

              return (
                <div key={`${c.type}-${c.value}`} className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-primary" />
                  {href ? (
                    <a href={href} className="text-primary hover:underline">
                      {c.label}: {c.value}
                    </a>
                  ) : (
                    <span>
                      {c.label}: {c.value}
                    </span>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
