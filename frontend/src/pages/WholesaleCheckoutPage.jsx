import { Suspense, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { ar, enUS } from "date-fns/locale"
import { toast } from "sonner"
import { fetchMyWholesaleReservations, wholesaleCheckoutReservation } from "@/services/wholesaleService"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { StandardLocationMapField } from "@/components/maps/StandardLocationMapField"
import { SAUDI_PHONE_INPUT_PROPS } from "@/lib/phone/saudiPhone"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getDirection } from "@/lib/direction"
import { cn } from "@/lib/utils"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { resolveImageUrl } from "@/lib/imageUrl"
import { Loader2, Package, Shield, ShoppingCart, Wallet } from "lucide-react"
import {
  getPurchaseFieldErrors,
  normalizeSaudiPhone,
  purchaseErrorMessage,
} from "@/lib/purchaseCheckoutValidation"

function formatSar(price, language) {
  if (price == null || !Number.isFinite(Number(price))) return "—"
  const locale = language?.startsWith("ar") ? "ar-SA" : "en-SA"
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(price))
  } catch {
    return String(price)
  }
}

function CheckoutSummaryRow({ label, value, className }) {
  return (
    <div className={cn("flex w-full min-w-0 items-baseline justify-between gap-3 text-sm", className)}>
      <span className="min-w-0 shrink text-muted-foreground">{label}</span>
      <span className="shrink-0">{value}</span>
    </div>
  )
}

export function WholesaleCheckoutPage() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const dir = getDirection(i18n.language)

  const { reservationId } = useParams()
  const navigate = useNavigate()
  const { user, token } = useAuthStore()

  const [paymentMethod, setPaymentMethod] = useState("escrow")
  const [shippingAddress, setShippingAddress] = useState("")
  const [shippingLat, setShippingLat] = useState("")
  const [shippingLng, setShippingLng] = useState("")
  const [buyerNote, setBuyerNote] = useState("")
  const [buyerPhone, setBuyerPhone] = useState("")
  const [buyerName, setBuyerName] = useState("")
  const mineQuery = useQuery({
    queryKey: ["wholesale", "my-reservations"],
    queryFn: fetchMyWholesaleReservations,
    enabled: Boolean(token),
  })

  const { data: balancePayload } = useQuery({
    queryKey: ["account", "balance"],
    queryFn: async () => {
      const { data } = await apiClient.get("/account/balance")
      return data?.data
    },
    enabled: Boolean(token),
  })

  const reservationsData = mineQuery.data ?? { waiting: [], completed: [], closed: [] }
  const allReservations = [...reservationsData.waiting, ...reservationsData.completed, ...reservationsData.closed]
  const reservation = allReservations.find((r) => String(r.id) === String(reservationId))
  const canCheckout = Boolean(
    reservation?.purchase_id == null &&
      (reservation?.can_checkout || reservation?.status === "payment_pending"),
  )

  const reservationQty = Math.min(999, Math.max(1, Math.floor(Number(reservation?.quantity ?? 1)) || 1))
  const unitPrice = Number(
    reservation?.price_snapshot ?? reservation?.product?.wholesale_price ?? 0,
  )
  const lineTotal =
    unitPrice > 0 ? Math.round(unitPrice * reservationQty * 100) / 100 : 0
  const allowCod = reservation?.product?.allow_cod !== false

  useEffect(() => {
    if (!reservation) return
    setBuyerName((n) => (n ? n : user?.name ?? ""))
    setBuyerPhone((p) => (p ? p : user?.phone ?? ""))
  }, [reservation?.id, user?.name, user?.phone])

  useEffect(() => {
    if (!allowCod && paymentMethod === "cod") {
      setPaymentMethod("escrow")
    }
  }, [allowCod, paymentMethod])

  const checkoutMutation = useMutation({
    mutationFn: (payload) => wholesaleCheckoutReservation(reservationId, payload),
    onSuccess: async (res) => {
      toast.success(res?.message ?? t("wholesale.checkout.success"))
      await queryClient.invalidateQueries({ queryKey: ["wholesale", "my-reservations"] })
      await queryClient.invalidateQueries({ queryKey: ["wholesale", "market"] })
      await queryClient.invalidateQueries({ queryKey: ["wholesale", "product"] })
      await queryClient.invalidateQueries({ queryKey: ["account", "balance"] })
      await queryClient.invalidateQueries({ queryKey: ["account", "orders"] })
      const orderId = res?.data?.id
      if (orderId) navigate(`/dashboard/orders/${orderId}`)
      else navigate("/dashboard/orders")
    },
    onError: (error) => {
      toast.error(purchaseErrorMessage(error, t) || t("wholesale.checkout.error"))
    },
  })

  const fieldErrors = useMemo(
    () =>
      getPurchaseFieldErrors(
        {
          buyerName,
          buyerPhone,
          quantity: reservationQty,
          buyerNote,
          shippingAddress,
          paymentMethod,
        },
        t,
      ),
    [buyerName, buyerPhone, reservationQty, buyerNote, shippingAddress, paymentMethod, t],
  )
  const formInvalid = Object.keys(fieldErrors).length > 0
  const mapIncomplete = shippingLat === "" || shippingLng === ""
  const availableBalance = Number(balancePayload?.available ?? 0)
  const escrowShortfall =
    paymentMethod === "escrow" && lineTotal > 0 ? Math.max(0, lineTotal - availableBalance) : 0
  const escrowBlocked = paymentMethod === "escrow" && escrowShortfall > 0

  const checkoutDeadlineLabel = (() => {
    const iso = reservation?.checkout_expires_at
    if (!iso || Number.isNaN(Date.parse(iso))) return null
    const d = new Date(iso)
    if (d.getTime() < Date.now()) return null
    const locale = i18n.language?.startsWith("ar") ? ar : enUS
    try {
      return format(d, "PPp", { locale })
    } catch {
      return iso
    }
  })()

  const align = "text-start"
  const labelRow = "w-full justify-start text-start"

  const handleSubmit = () => {
    if (checkoutMutation.isPending || !reservation) return
    if (mapIncomplete) {
      toast.error(t("purchase.mapPinRequired"))
      return
    }
    if (formInvalid) {
      toast.error(t("purchase.validation.fixForm", "Please fix the highlighted fields."))
      return
    }
    if (escrowBlocked) {
      toast.error(t("purchase.insufficientBalance"))
      return
    }
    const phoneNorm = normalizeSaudiPhone(buyerPhone)
    checkoutMutation.mutate({
      payment_method: paymentMethod,
      shipping_address: shippingAddress?.trim() ? shippingAddress.trim() : null,
      shipping_lat: Number(shippingLat),
      shipping_lng: Number(shippingLng),
      buyer_note: buyerNote?.trim() ? buyerNote.trim() : null,
      buyer_phone: phoneNorm || user?.phone,
      buyer_email: user?.email,
      buyer_name: buyerName?.trim() ? buyerName.trim() : user?.name,
    })
  }

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8" dir={dir}>
      <div className="flex flex-col gap-2 items-start text-start">
        <Button variant="ghost" size="sm" asChild className="-ms-0.5 w-fit">
          <Link to="/wholesale/reservations">{t("wholesale.checkout.backToReservations")}</Link>
        </Button>
        <h1 className="flex w-full min-w-0 items-center gap-2 text-2xl font-bold">
          <ShoppingCart className="size-7 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 break-words">{t("wholesale.checkout.title")}</span>
        </h1>
      </div>

      {mineQuery.isLoading ? (
        <Card dir={dir}>
          <CardContent className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : !reservation ? (
        <Card dir={dir}>
          <CardContent className={cn("p-6 text-sm text-muted-foreground", align)}>
            {t("wholesale.checkout.notFound")}
            <div className="mt-3 flex justify-start">
              <Button asChild variant="outline">
                <Link to="/wholesale/reservations">{t("wholesale.checkout.goReservations")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !canCheckout ? (
        <Card dir={dir}>
          <CardContent className={cn("p-6 text-sm text-muted-foreground", align)}>
            {t("wholesale.checkout.notEligible")}
            <div className="mt-3 flex justify-start">
              <Button asChild variant="outline">
                <Link to="/wholesale/reservations">{t("wholesale.checkout.goReservations")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card dir={dir}>
            <CardHeader className={cn("flex flex-col gap-2", align)}>
              <CardTitle className={align}>{t("purchase.invoice")}</CardTitle>
              <CardDescription className={align}>{t("wholesale.checkout.invoiceDescription")}</CardDescription>
            </CardHeader>
            <CardContent className={cn("space-y-4", align)}>
              <div className="flex min-w-0 items-start gap-4 rounded-lg border p-4">
                {reservation.product?.image_url ? (
                  <img
                    src={resolveImageUrl(reservation.product.image_url)}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-lg object-cover"
                  />
                ) : null}
                <div className={cn("min-w-0 flex-1 space-y-1", align)}>
                  <p className="font-semibold leading-snug">{reservation.product?.title}</p>
                  {reservation.product?.seller?.name ? (
                    <p className="text-sm text-muted-foreground">
                      {t("purchase.sellerLabel")}: {reservation.product.seller.name}
                    </p>
                  ) : null}
                  {checkoutDeadlineLabel ? (
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      {t("wholesale.checkout.payBefore")}: {checkoutDeadlineLabel}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className={cn("space-y-2", align)}>
                <Label className={labelRow}>{t("purchase.buyerName")}</Label>
                <Input
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder={t("auth.namePlaceholder")}
                  aria-invalid={Boolean(fieldErrors.buyerName)}
                />
                {fieldErrors.buyerName ? <p className="text-sm text-destructive">{fieldErrors.buyerName}</p> : null}
              </div>
              <div className={cn("space-y-2", align)}>
                <Label className={labelRow}>{t("purchase.buyerPhone")}</Label>
                <Input
                  {...SAUDI_PHONE_INPUT_PROPS}
                  dir="ltr"
                  className="text-start"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.buyerPhone)}
                />
                {fieldErrors.buyerPhone ? <p className="text-sm text-destructive">{fieldErrors.buyerPhone}</p> : null}
              </div>
              <div className={cn("space-y-2", align)}>
                <Label className={labelRow}>
                  {t("purchase.shippingAddress")}
                  {paymentMethod === "cod"
                    ? ` (${t("purchase.shippingRequiredForCod")})`
                    : ` (${t("common.optional")})`}
                </Label>
                <Textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder={t("purchase.addressPlaceholder")}
                  rows={3}
                  aria-invalid={Boolean(fieldErrors.shippingAddress)}
                />
                {fieldErrors.shippingAddress ? (
                  <p className="text-sm text-destructive">{fieldErrors.shippingAddress}</p>
                ) : null}
              </div>
              <div className={cn("space-y-1", align)}>
                <Label className={cn("text-xs text-muted-foreground", labelRow)}>
                  {t("wholesale.checkout.mapSelectLabel")}
                </Label>
                <p className={cn("text-xs text-muted-foreground", align)}>{t("wholesale.checkout.mapHint")}</p>
                <Suspense
                  fallback={
                    <Skeleton className="flex h-[220px] w-full items-center justify-center rounded-md border border-border text-xs text-muted-foreground">
                      {t("common.loading")}
                    </Skeleton>
                  }
                >
                  <StandardLocationMapField
                    key={`wholesale-checkout-map-${reservation?.id ?? "new"}`}
                    language={i18n.language}
                    lat={shippingLat === "" ? null : Number(shippingLat)}
                    lng={shippingLng === "" ? null : Number(shippingLng)}
                    address={shippingAddress}
                    searchPlaceholder={t("purchase.addressPlaceholder")}
                    onAddressResolved={(addr) => {
                      if (addr) setShippingAddress(addr)
                    }}
                    onChange={({ lat, lng }) => {
                      setShippingLat(String(lat))
                      setShippingLng(String(lng))
                    }}
                    onPlaceResolved={(addr, lat, lng) => {
                      setShippingAddress((prev) => addr || prev)
                      if (lat != null) setShippingLat(String(lat))
                      if (lng != null) setShippingLng(String(lng))
                    }}
                  />
                </Suspense>
                {mapIncomplete ? (
                  <p className="text-sm text-muted-foreground">{t("purchase.mapPinRequired")}</p>
                ) : null}
              </div>
              <div className={cn("space-y-2", align)}>
                <Label className={labelRow}>{t("purchase.buyerNote")}</Label>
                <Textarea
                  value={buyerNote}
                  onChange={(e) => setBuyerNote(e.target.value)}
                  placeholder={t("purchase.buyerNotePlaceholder")}
                  rows={2}
                  aria-invalid={Boolean(fieldErrors.buyerNote)}
                />
                {fieldErrors.buyerNote ? <p className="text-sm text-destructive">{fieldErrors.buyerNote}</p> : null}
              </div>
            </CardContent>
          </Card>

          <Card dir={dir}>
            <CardHeader className={cn("flex flex-col gap-2", align)}>
              <CardTitle className={align}>{t("purchase.orderSummary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <CheckoutSummaryRow
                label={t("purchase.unitPrice")}
                value={
                  <span dir="ltr" className="font-semibold tabular-nums">
                    {formatSar(unitPrice, i18n.language)}
                  </span>
                }
              />
              <CheckoutSummaryRow
                label={t("purchase.quantity")}
                value={
                  <span dir="ltr" className="font-semibold tabular-nums">
                    × {reservationQty}
                  </span>
                }
              />
              <CheckoutSummaryRow
                label={t("purchase.lineSubtotal")}
                value={
                  <span dir="ltr" className="font-semibold tabular-nums">
                    {formatSar(lineTotal, i18n.language)}
                  </span>
                }
              />
              <CheckoutSummaryRow
                label={t("purchase.selectedPayment")}
                value={
                  <span className="max-w-[14rem] shrink font-semibold leading-snug sm:max-w-none">
                    {paymentMethod === "cod" ? t("purchase.cod") : t("purchase.escrow")}
                  </span>
                }
              />
              <div className="flex w-full min-w-0 items-baseline justify-between gap-3 border-t border-border pt-3 text-base">
                <span className="min-w-0 shrink font-semibold">{t("purchase.invoiceTotal")}</span>
                <span dir="ltr" className="shrink-0 font-bold text-primary tabular-nums">
                  {formatSar(lineTotal, i18n.language)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card dir={dir}>
            <CardHeader className={cn("flex flex-col gap-2", align)}>
              <CardTitle className={align}>{t("purchase.paymentMethod")}</CardTitle>
              <CardDescription className={align}>{t("purchase.paymentMethodDescription")}</CardDescription>
            </CardHeader>
            <CardContent className={cn(align)}>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
                <div className="flex w-full min-w-0 items-start gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-primary">
                  <RadioGroupItem value="escrow" id="wholesale-escrow" className="mt-0.5 shrink-0" />
                  <Label
                    htmlFor="wholesale-escrow"
                    className={cn("min-w-0 flex-1 cursor-pointer !flex-col !items-stretch gap-0", align)}
                  >
                    <div className="flex w-full min-w-0 items-center gap-2 font-semibold">
                      <Wallet className="size-5 shrink-0" aria-hidden />
                      {t("purchase.escrow")}
                    </div>
                    <p className={cn("mt-1 text-sm text-muted-foreground", align)}>{t("purchase.escrowDescription")}</p>
                  </Label>
                </div>
                {allowCod ? (
                  <div className="flex w-full min-w-0 items-start gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-primary">
                    <RadioGroupItem value="cod" id="wholesale-cod" className="mt-0.5 shrink-0" />
                    <Label
                      htmlFor="wholesale-cod"
                      className={cn("min-w-0 flex-1 cursor-pointer !flex-col !items-stretch gap-0", align)}
                    >
                      <div className="flex w-full min-w-0 items-center gap-2 font-semibold">
                        <Package className="size-5 shrink-0" aria-hidden />
                        {t("purchase.cod")}
                      </div>
                      <p className={cn("mt-1 text-sm text-muted-foreground", align)}>{t("purchase.codDescription")}</p>
                    </Label>
                  </div>
                ) : (
                  <p className={cn("text-sm text-muted-foreground", align)}>
                    {t("purchase.codNotAllowed")}
                  </p>
                )}
              </RadioGroup>
              {paymentMethod === "escrow" ? (
                <div className="mt-4 space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
                  <CheckoutSummaryRow
                    label={t("purchase.availableBalance")}
                    value={
                      <span dir="ltr" className="font-semibold tabular-nums">
                        {formatSar(availableBalance, i18n.language)}
                      </span>
                    }
                  />
                  <CheckoutSummaryRow
                    label={t("purchase.requiredForOrder")}
                    value={
                      <span dir="ltr" className="font-semibold tabular-nums">
                        {formatSar(lineTotal, i18n.language)}
                      </span>
                    }
                  />
                  {escrowBlocked ? (
                    <p className={cn("pt-1 text-destructive", align)}>
                      {t("purchase.insufficientBalance")}{" "}
                      <Link
                        to="/dashboard/wallet"
                        className="font-medium text-primary underline underline-offset-2"
                      >
                        {t("purchase.openWallet")}
                      </Link>
                    </p>
                  ) : (
                    <p className={cn("pt-1 text-muted-foreground", align)}>{t("purchase.escrowHoldHint")}</p>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex w-full items-center gap-3 rounded-lg bg-primary/10 p-4 text-sm">
            <Shield className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1 leading-relaxed">{t("purchase.trustMessage")}</span>
          </div>

          <div className="flex w-full flex-row items-stretch gap-3 border-t border-border pt-6">
            <Button
              type="button"
              variant="ghost"
              className="h-11 min-h-11 shrink-0 px-3 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
              asChild
            >
              <Link to="/wholesale/reservations">{t("common.cancel")}</Link>
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-11 min-h-11 min-w-0 flex-1 rounded-lg px-4 text-base font-semibold shadow-sm sm:min-w-[14rem]"
              disabled={checkoutMutation.isPending || formInvalid || escrowBlocked || mapIncomplete}
              onClick={handleSubmit}
            >
              {checkoutMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShoppingCart className="size-4" />
              )}
              {t("purchase.confirm")}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
