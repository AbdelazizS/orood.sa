import { useTranslation } from "react-i18next"

/**
 * Renders admin-configured bank transfer instructions from payment method schema.
 */
export function WalletMethodInstructions({ method }) {
  const { i18n } = useTranslation()
  const locale = i18n.language?.startsWith("en") ? "en" : "ar"
  const instructions = method?.instructions?.[locale] ?? method?.instructions?.ar ?? {}
  const steps = instructions.steps ?? []

  if (!method) return null

  return (
    <div className="rounded-md border p-3 text-sm space-y-2">
      {instructions.title ? <p className="font-medium">{instructions.title}</p> : null}
      {steps.length > 0 ? (
        <ol className="list-decimal space-y-1 ps-4 text-muted-foreground">
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      ) : null}
      <div className="grid gap-1 text-foreground">
        {instructions.account_name ? (
          <p>
            {locale === "en" ? "Account name" : "اسم الحساب"}: {instructions.account_name}
          </p>
        ) : null}
        {instructions.bank_name ? (
          <p>
            {locale === "en" ? "Bank" : "البنك"}: {instructions.bank_name}
          </p>
        ) : null}
        {instructions.iban ? (
          <p className="break-all">
            IBAN: {instructions.iban}
          </p>
        ) : null}
      </div>
      {method.processing_time ? (
        <p className="text-xs text-muted-foreground">{method.processing_time}</p>
      ) : null}
    </div>
  )
}
