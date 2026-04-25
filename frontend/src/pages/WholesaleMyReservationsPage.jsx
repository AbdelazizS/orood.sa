import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { fetchMyWholesaleReservations } from "@/services/wholesaleService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getDirection, isRtlLanguage } from "@/lib/direction"
import { cn } from "@/lib/utils"

function ReservationList({ title, rows, checkoutLabel, t, isRTL }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">{t("wholesale.myReservations.emptySection")}</p> : null}
        {rows.map((row) => (
          <div key={row.id} className={cn("rounded-lg border p-3", isRTL ? "text-end" : "text-start")}>
            <div className={cn("flex items-center justify-between gap-2", isRTL ? "" : "flex-row-reverse")}>
              <div>
                <p className="font-semibold">{row.product?.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t("wholesale.myReservations.qty")} {row.quantity}
                </p>
              </div>
              <Badge variant="outline">{t(`wholesale.reservationStatus.${row.status}`, row.status)}</Badge>
            </div>
            <div className={cn("mt-2 flex flex-wrap gap-2", isRTL ? "justify-end" : "justify-start")}>
              {row.product?.id ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/wholesale/product/${row.product.id}`}>{t("wholesale.myReservations.openProduct")}</Link>
                </Button>
              ) : null}
              {row.can_checkout ? (
                <Button size="sm" asChild>
                  <Link to={`/wholesale/checkout/${row.id}`}>{checkoutLabel}</Link>
                </Button>
              ) : null}
              {row.purchase_id ? (
                <Button size="sm" variant="secondary" asChild>
                  <Link to={`/dashboard/orders/${row.purchase_id}`}>{t("wholesale.myReservations.openOrder")}</Link>
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function WholesaleMyReservationsPage() {
  const { t, i18n } = useTranslation()
  const dir = getDirection(i18n.language)
  const isRTL = isRtlLanguage(i18n.language)
  const query = useQuery({
    queryKey: ["wholesale", "my-reservations"],
    queryFn: fetchMyWholesaleReservations,
  })
  const data = query.data ?? { waiting: [], completed: [], closed: [] }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6" dir={dir}>
      <h1 className={cn("text-2xl font-bold", isRTL ? "text-end" : "text-start")}>{t("wholesale.myReservations.title")}</h1>
      <ReservationList
        title={t("wholesale.myReservations.waiting")}
        rows={data.waiting}
        checkoutLabel={t("wholesale.myReservations.checkout")}
        t={t}
        isRTL={isRTL}
      />
      <ReservationList
        title={t("wholesale.myReservations.completed")}
        rows={data.completed}
        checkoutLabel={t("wholesale.myReservations.viewCheckout")}
        t={t}
        isRTL={isRTL}
      />
      <ReservationList
        title={t("wholesale.myReservations.closed")}
        rows={data.closed}
        checkoutLabel={t("wholesale.myReservations.viewCheckout")}
        t={t}
        isRTL={isRTL}
      />
    </section>
  )
}
