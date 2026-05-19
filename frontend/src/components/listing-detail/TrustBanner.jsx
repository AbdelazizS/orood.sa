import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Separator } from "@/components/ui/separator"

/**
 * Section 11 — Trust Banner.
 * Numbered circles 1,2,3,4. No card border.
 */
export function TrustBanner({ omitShippingTrustBlock = false }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()

  const segments = [
    {
      key: "buy",
      title: t("listingDetail.trustBuy", "اشتر وكن مطمئن"),
      items: [
        t("listingDetail.trustBuy1", "توثيق حسابات البائعين والتأكد من صحة بياناتهم لمنع أي احتيال أو تلاعب."),
        t("listingDetail.trustBuy2", "ضمان مطابقة المنتج للوصف المعروض."),
        t("listingDetail.trustBuy3", "استرجاع كامل لمبلغك إذا لم يصلك المنتج أو كان مختلفاً عن الوصف."),
      ],
    },
    omitShippingTrustBlock
      ? null
      : {
          key: "ship",
          title: t("listingDetail.trustShip", "اشحن وكن مطمئن"),
          items: [
            t("listingDetail.trustShipDamage", "استرجاع المبلغ في حال تعرض المنتج للتلف أثناء الشحن أو التنزيل."),
            t("listingDetail.trustShipFast", "سرعة في التوصيل: خلال 30 دقيقة أو أقل من 24 ساعة داخل المدينة."),
            t("listingDetail.trustViewAtLocation", "إمكانية طلب مشاهدة المنتج عند موقعك قبل الشراء للتأكد منه."),
          ],
        },
    {
      key: "pay",
      title: t("listingDetail.trustPay", "ادفع وكن مطمئن"),
      items: [
        t("listingDetail.trustPay1", "قنوات دفع آمنة"),
        t("listingDetail.trustEscrow", "خاصية الطرف الثالث لاحتفاظ المبلغ"),
      ],
    },
    {
      key: "contact",
      title: t("listingDetail.trustContact", "تواصل معنا وكن مطمئن"),
      items: [t("listingDetail.trustSupport", "سرعة في الرد وحل أي مشكلة")],
    },
  ].filter(Boolean)

  const rows = segments.map((row, i) => ({ ...row, num: i + 1 }))

  return (
    <>
      <div dir={direction} className="px-4 py-4 sm:px-6">
        <h3 className="mb-3 text-start text-base font-bold">
          {t("listingDetail.trustTitle", "برنامج: كن مطمئن مع منصة عروض")}
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {rows.map((row) => (
            <div key={row.key} className="flex items-start gap-3">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {row.num}
              </div>
              <div className="min-w-0 flex-1 text-start">
                <p className="mb-1 text-sm font-semibold text-primary">{row.title}</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {row.items.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <Separator className="my-3" />
        <p className="text-center text-sm font-bold text-primary">
          {t("listingDetail.trustCta", "تسوق أي عروض من عروض وكن مطمئن")}
        </p>
      </div>
    </>
  )
}
