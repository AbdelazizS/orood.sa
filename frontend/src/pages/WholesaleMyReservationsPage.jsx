import { useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { fetchMyWholesaleReservations, cancelWholesaleReservation } from "@/services/wholesaleService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getDirection } from "@/lib/direction"
import { WholesalePageShell } from "@/components/wholesale/WholesalePageShell"
import { WholesaleCancelConfirmDialog } from "@/components/wholesale/WholesaleReservationDialogs"

function ReservationList({ title, rows, checkoutLabel, t, dir, onCancelRequest, section }) {
  return (
    <Card dir={dir}>
      <CardHeader>
        <CardTitle className="text-start text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? <p className="text-start text-sm text-muted-foreground">{t("wholesale.myReservations.emptySection")}</p> : null}
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-border/80 bg-card/40 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 text-start">
                <p className="font-semibold leading-snug">{row.product?.title ?? "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("wholesale.myReservations.qty")} {row.quantity}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {t(`wholesale.reservationStatus.${row.status}`, row.status)}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
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
              {row.can_cancel && row.product?.id ? (
                <Button type="button" size="sm" variant="destructive" onClick={() => onCancelRequest(row)}>
                  {t("wholesale.myReservations.cancelReservation")}
                </Button>
              ) : null}
            </div>
            {!row.can_cancel && row.product?.id && (section === "completed" || section === "closed") ? (
              <p className="mt-2 text-start text-xs text-muted-foreground">{t("wholesale.myReservations.cancelHintNotActive")}</p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function WholesaleMyReservationsPage() {
  const { t, i18n } = useTranslation()
  const dir = getDirection(i18n.language)
  const queryClient = useQueryClient()
  const [cancelDialog, setCancelDialog] = useState(null)

  const query = useQuery({
    queryKey: ["wholesale", "my-reservations"],
    queryFn: fetchMyWholesaleReservations,
  })
  const data = query.data ?? { waiting: [], completed: [], closed: [] }

  const cancelMutation = useMutation({
    mutationFn: (productId) => cancelWholesaleReservation(productId),
    onSuccess: () => {
      setCancelDialog(null)
      toast.success(t("wholesale.market.cancelSuccess"))
      queryClient.invalidateQueries({ queryKey: ["wholesale", "my-reservations"] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("wholesale.market.cancelError"))
    },
  })

  const onCancelRequest = useCallback((row) => {
    if (!row?.product?.id) return
    setCancelDialog({ productId: row.product.id, title: row.product?.title ?? "" })
  }, [])

  const commitCancel = useCallback(() => {
    if (!cancelDialog?.productId) return
    cancelMutation.mutate(cancelDialog.productId)
  }, [cancelDialog, cancelMutation])

  const cancelPending =
    cancelMutation.isPending && cancelMutation.variables === cancelDialog?.productId

  return (
    <section className="min-h-[400px] bg-background pb-10 pt-4 md:pt-6" dir={dir}>
      <WholesalePageShell className="space-y-6 py-2">
        <h1 className="text-start text-2xl font-bold">{t("wholesale.myReservations.title")}</h1>

        <ReservationList
          title={t("wholesale.myReservations.waiting")}
          rows={data.waiting}
          checkoutLabel={t("wholesale.myReservations.checkout")}
          t={t}
          dir={dir}
          onCancelRequest={onCancelRequest}
          section="waiting"
        />
        <ReservationList
          title={t("wholesale.myReservations.completed")}
          rows={data.completed}
          checkoutLabel={t("wholesale.myReservations.viewCheckout")}
          t={t}
          dir={dir}
          onCancelRequest={onCancelRequest}
          section="completed"
        />
        <ReservationList
          title={t("wholesale.myReservations.closed")}
          rows={data.closed}
          checkoutLabel={t("wholesale.myReservations.viewCheckout")}
          t={t}
          dir={dir}
          onCancelRequest={onCancelRequest}
          section="closed"
        />
      </WholesalePageShell>

      <WholesaleCancelConfirmDialog
        open={Boolean(cancelDialog)}
        onOpenChange={(open) => {
          if (!open) setCancelDialog(null)
        }}
        title={cancelDialog?.title ?? ""}
        onConfirm={commitCancel}
        pending={cancelPending}
      />
    </section>
  )
}
