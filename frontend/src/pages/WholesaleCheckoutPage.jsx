import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { fetchMyWholesaleReservations, wholesaleCheckoutReservation } from "@/services/wholesaleService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getDirection, isRtlLanguage } from "@/lib/direction"
import { cn } from "@/lib/utils"

export function WholesaleCheckoutPage() {
  const { t, i18n } = useTranslation()
  const dir = getDirection(i18n.language)
  const isRTL = isRtlLanguage(i18n.language)
  const { reservationId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    payment_method: "escrow",
    shipping_address: "",
    buyer_note: "",
    buyer_phone: "",
    buyer_email: "",
    buyer_name: "",
  })

  const mineQuery = useQuery({
    queryKey: ["wholesale", "my-reservations"],
    queryFn: fetchMyWholesaleReservations,
  })
  const reservationsData = mineQuery.data ?? { waiting: [], completed: [], closed: [] }
  const allReservations = [...reservationsData.waiting, ...reservationsData.completed, ...reservationsData.closed]
  const reservation = allReservations.find((r) => String(r.id) === String(reservationId))
  const canCheckout = Boolean(
    reservation?.can_checkout ||
    reservation?.status === "payment_pending"
  )

  const checkoutMutation = useMutation({
    mutationFn: (payload) => wholesaleCheckoutReservation(reservationId, payload),
    onSuccess: (res) => {
      toast.success(res?.message ?? t("wholesale.checkout.success"))
      const orderId = res?.data?.id
      if (orderId) navigate(`/dashboard/orders/${orderId}`)
      else navigate("/dashboard/orders")
    },
    onError: (error) => toast.error(error?.response?.data?.message ?? t("wholesale.checkout.error")),
  })

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6" dir={dir}>
      <h1 className={cn("text-2xl font-bold", isRTL ? "text-end" : "text-start")}>{t("wholesale.checkout.title")}</h1>
      {!reservation ? (
        <Card>
          <CardContent className={cn("p-6 text-sm text-muted-foreground", isRTL ? "text-end" : "text-start")}>
            {t("wholesale.checkout.notFound")}
            <div className="mt-3">
              <Button asChild variant="outline">
                <Link to="/wholesale/reservations">{t("wholesale.checkout.goReservations")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !canCheckout ? (
        <Card>
          <CardContent className={cn("p-6 text-sm text-muted-foreground", isRTL ? "text-end" : "text-start")}>
            {t("wholesale.checkout.notEligible")}
            <div className="mt-3">
              <Button asChild variant="outline">
                <Link to="/wholesale/reservations">{t("wholesale.checkout.goReservations")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{reservation.product?.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted/40 p-3 text-sm">
              <p>{t("wholesale.checkout.quantity")}: {reservation.quantity}</p>
              <p>{t("wholesale.checkout.unitPrice")}: {reservation.product?.wholesale_price}</p>
              <p>{t("wholesale.checkout.total")}: {(Number(reservation.product?.wholesale_price || 0) * Number(reservation.quantity || 1)).toFixed(2)}</p>
            </div>
            <div className={cn("space-y-2", isRTL ? "text-end" : "text-start")}>
              <Label>{t("wholesale.checkout.paymentMethod")}</Label>
              <Select value={form.payment_method} onValueChange={(value) => setForm((s) => ({ ...s, payment_method: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="escrow">{t("dashboard.paymentMethod.escrow")}</SelectItem>
                  <SelectItem value="cod">{t("dashboard.paymentMethod.cod")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={cn("space-y-2", isRTL ? "text-end" : "text-start")}>
              <Label>{t("orders.shippingAddress", "عنوان الشحن")}</Label>
              <Textarea value={form.shipping_address} onChange={(e) => setForm((s) => ({ ...s, shipping_address: e.target.value }))} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder={t("orders.buyerName", "اسم المستلم")} value={form.buyer_name} onChange={(e) => setForm((s) => ({ ...s, buyer_name: e.target.value }))} />
              <Input placeholder={t("orders.buyerPhone", "رقم الجوال")} value={form.buyer_phone} onChange={(e) => setForm((s) => ({ ...s, buyer_phone: e.target.value }))} />
              <Input placeholder={t("orders.buyerEmail", "البريد الإلكتروني")} value={form.buyer_email} onChange={(e) => setForm((s) => ({ ...s, buyer_email: e.target.value }))} />
              <Input placeholder={t("orders.buyerNote", "ملاحظة")} value={form.buyer_note} onChange={(e) => setForm((s) => ({ ...s, buyer_note: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={() => checkoutMutation.mutate(form)} disabled={checkoutMutation.isPending}>
              {t("wholesale.checkout.submit")}
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
