import { useTranslation } from "react-i18next"

/**
 * Two-column terms section per PDF spec.
 * Right column: full terms. Left column: short terms.
 */
export function TermsColumns() {
  const { t } = useTranslation()

  return (
    <div dir="rtl" className="grid grid-cols-2 gap-3">
      <div className="rounded-md border border-border bg-muted/30 p-3 text-end text-xs leading-relaxed text-muted-foreground">
        <ol className="list-decimal space-y-2 pe-4">
          <li>{t("auth.termsRight1")}</li>
          <li>{t("auth.termsRight2")}</li>
          <li>{t("auth.termsRight3")}</li>
        </ol>
      </div>
      <div className="rounded-md border border-border bg-muted/30 p-3 text-end text-xs leading-relaxed text-muted-foreground">
        <ol className="list-decimal space-y-2 pe-4">
          <li>{t("auth.termsLeft1")}</li>
          <li>{t("auth.termsLeft2")}</li>
          <li>{t("auth.termsLeft3")}</li>
        </ol>
      </div>
    </div>
  )
}
