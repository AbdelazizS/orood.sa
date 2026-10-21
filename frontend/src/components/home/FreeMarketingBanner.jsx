import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { BadgePercent, ArrowLeft, ArrowRight } from "lucide-react"

/**
 * Homepage value strip — tells visitors that marketing and selling on Arooth is free.
 */
export function FreeMarketingBanner() {
  const { t, i18n } = useTranslation()
  const Arrow = i18n.dir() === "rtl" ? ArrowLeft : ArrowRight

  return (
    <div className="border-b border-primary/15 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent px-4 py-2.5 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground sm:size-9">
          <BadgePercent className="size-4 sm:size-5" />
        </div>
        <p className="flex-1 min-w-0 text-sm leading-snug">
          <span className="font-bold text-primary">
            {t("freeMarketing.title", "تسويق مجاني 100%")}
          </span>
          <span className="mx-1.5 text-muted-foreground/60">·</span>
          <span className="text-foreground/80">
            {t("freeMarketing.message", "لا توجد أي رسوم على التسويق أو البيع في منصة عروض")}
          </span>
        </p>
        <Link
          to="/add"
          className="hidden shrink-0 items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:inline-flex"
        >
          {t("freeMarketing.cta", "أضف عرضك مجاناً")}
          <Arrow className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}
