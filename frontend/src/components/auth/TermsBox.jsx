import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

/**
 * Single terms box — all terms in one container.
 * Big-company style: clear, readable, consistent.
 */
export function TermsBox({ expanded = false, onExpandedChange }) {
  const { t } = useTranslation()

  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-4 text-sm leading-relaxed text-muted-foreground sm:px-6">
      <div>
        <div>
          <p className="mb-2 font-semibold text-foreground">{t("auth.platformRoleTitle")}</p>
          <ol className="list-decimal space-y-1 ps-4">
            <li>{t("auth.platformRole1")}</li>
            <li>{t("auth.platformRole2")}</li>
            <li>{t("auth.platformRole3")}</li>
            <li>{t("auth.platformRole4")}</li>
          </ol>
        </div>
        <div className="mt-3">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-sm"
            onClick={() => onExpandedChange?.(!expanded)}
          >
            {expanded ? t("auth.hideWarranties", "إخفاء التعهدات") : t("auth.showWarranties", "عرض التعهدات الخاصة بي")}
          </Button>
        </div>
      </div>
      {expanded ? (
        <div className="mt-4 border-t border-border/60 pt-4">
        <div>
          <p className="mb-2 font-semibold text-foreground">{t("auth.userOathTitle")}</p>
          <ol className="list-decimal space-y-1 ps-4">
            <li>{t("auth.userOath1")}</li>
            <li>{t("auth.userOath2")}</li>
            <li>{t("auth.userOath3")}</li>
            <li>{t("auth.userOath4")}</li>
          </ol>
        </div>
        </div>
      ) : null}
    </div>
  )
}
