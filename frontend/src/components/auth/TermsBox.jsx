import { useTranslation } from "react-i18next"

/**
 * Single terms box — all terms in one container.
 * Big-company style: clear, readable, consistent.
 */
export function TermsBox() {
  const { t } = useTranslation()

  return (
    <div className="rounded-lg border border-border bg-muted/30 px-6 py-3 text-sm leading-relaxed text-muted-foreground">
      <ol className="list-decimal space-y-2 pe-4 text-">
        <li>{t("auth.termsRight1")}</li>
        <li>{t("auth.termsRight2")}</li>
        <li>{t("auth.termsRight3")}</li>
      </ol>
    </div>
  )
}
