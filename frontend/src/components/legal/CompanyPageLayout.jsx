import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useAppDirection } from "@/providers/DirectionProvider"
import { PAGE_CONTAINER_CLASS, PAGE_HERO_BLEED_CLASS } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

export function CompanyPageLayout({
  title,
  updatedAt,
  locale = "ar",
  children,
  showSupportCta = false,
}) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()

  return (
    <div
      className={cn(PAGE_CONTAINER_CLASS, "min-h-[50vh] overflow-x-hidden bg-background")}
      dir={direction}
    >
      <section className={cn(PAGE_HERO_BLEED_CLASS, "py-6 sm:py-10 md:py-12")}>
        <div className="w-full min-w-0 text-start">
          <p className="text-sm font-medium text-primary">
            {t("legal.companyKicker", "منصة عروض Arooth")}
          </p>
          <h1 className="mt-2 text-xl font-bold text-foreground sm:text-3xl md:text-4xl">{title}</h1>
          {updatedAt ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("legal.lastUpdated", "آخر تحديث")}:{" "}
              {new Date(updatedAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          ) : null}
        </div>
      </section>

      <div className="w-full min-w-0 py-6 sm:py-10 md:py-12">
        <div
          className={cn(
            "legal-content prose prose-neutral w-full max-w-none text-start dark:prose-invert rtl:prose-rtl",
          )}
        >
          {children}
        </div>

        {showSupportCta ? (
          <div className="legal-callout mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-start">
              <p className="font-semibold text-foreground">
                {t("legal.needHelp", "لم تجد إجابتك؟")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("legal.needHelpHint", "تواصل مع فريق الدعم أو قدّم بلاغاً رسمياً.")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="default" className="w-full sm:w-auto">
                <Link to="/contact">{t("footer.compact.bottomContact", "خدمات العملاء")}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to="/contact?topic=report">
                  {t("footer.compact.bottomReport", "الإبلاغ عن مشكلة")}
                </Link>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
