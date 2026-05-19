import { useTranslation } from "react-i18next"
import { useBranding } from "@/hooks/useBranding"
import { useAppDirection } from "@/providers/DirectionProvider"
import { cn } from "@/lib/utils"

export function FooterLegalBar() {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const { copyrightLine, developerCredit } = useBranding()
  const isRtl = direction === "rtl"
  const copyright = copyrightLine()
  const developer = developerCredit()

  return (
    <div className="border-t border-border bg-muted/30">
      <div
        className={cn(
          "mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-4 text-center text-xs text-muted-foreground sm:px-6",
        )}
      >
        <p dir={isRtl ? "rtl" : "ltr"}>{copyright}</p>

        {developer?.show && developer.name && developer.linkedinUrl ? (
          <p>
            {t("footer.compact.developedBy", "تم التطوير بواسطة")}{" "}
            <a
              href={developer.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {developer.name}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  )
}
