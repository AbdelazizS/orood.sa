import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Mail, Clock, MessageCircle } from "lucide-react"

export function ContactIntroSection({ isReportFlow, channels = [] }) {
  const { t } = useTranslation()

  const emailChannel = channels.find(
    (ch) => ch.type === "email" && String(ch.value ?? "").trim() !== "",
  )

  if (isReportFlow) {
    return (
      <section className="mb-8 rounded-xl border border-border bg-muted/30 p-6">
        <h2 className="text-lg font-semibold">{t("contactPage.reportTypesTitle", "أنواع البلاغات")}</h2>
        <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-muted-foreground">
          <li>{t("contactPage.reportTypeListing", "إعلان مخالف")}</li>
          <li>{t("contactPage.reportTypeUser", "مستخدم مخالف")}</li>
          <li>{t("contactPage.reportTypeFraud", "عملية احتيال أو نصب")}</li>
          <li>{t("contactPage.reportTypeCounterfeit", "منتج مغشوش")}</li>
          <li>{t("contactPage.reportTypeOther", "أخرى")}</li>
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          {t(
            "contactPage.reportPrivacy",
            "يتم التعامل مع جميع البلاغات بسرية. سنرد خلال 24 ساعة.",
          )}
        </p>
      </section>
    )
  }

  return (
    <section
      className={`mb-8 grid grid-cols-1 gap-4 sm:gap-6 ${emailChannel ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}
    >
      {emailChannel ? (
        <div className="rounded-xl border border-border bg-card p-5">
          <Mail className="size-5 text-primary" aria-hidden />
          <h2 className="mt-2 font-semibold">{t("contactPage.introEmailTitle", "البريد الإلكتروني")}</h2>
          <p className="mt-1 text-sm text-muted-foreground break-all">{emailChannel.value}</p>
        </div>
      ) : null}
      <div className="rounded-xl border border-border bg-card p-5">
        <Clock className="size-5 text-primary" aria-hidden />
        <h2 className="mt-2 font-semibold">{t("contactPage.introHoursTitle", "ساعات العمل")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("contactPage.introHours", "السبت – الخميس: 9 ص – 9 م")}
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <MessageCircle className="size-5 text-primary" aria-hidden />
        <h2 className="mt-2 font-semibold">{t("contactPage.introReportTitle", "إبلاغ رسمي")}</h2>
        <Button asChild variant="link" className="h-auto p-0 text-primary">
          <Link to="/contact?topic=report">{t("contactPage.goToReport", "نموذج الإبلاغ")}</Link>
        </Button>
      </div>
    </section>
  )
}
