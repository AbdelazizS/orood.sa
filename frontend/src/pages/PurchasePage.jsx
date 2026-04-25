import { Suspense, useState, useEffect, useMemo, useRef } from "react"
import { useParams, useNavigate, Navigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { LocationMapPicker } from "@/components/maps/LocationMapPicker"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { ShoppingCart, Loader2, Wallet, Package, Shield } from "lucide-react"
import { resolveImageUrl } from "@/lib/imageUrl"
import { toast } from "sonner"

const formatPrice = (price, t) => {
  if (price == null) return null
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(price)
}

/** Laravel-style API error body → single user-facing string */
function purchaseErrorMessage(error, t) {
  const data = error?.response?.data
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message
  }
  const errors = data?.errors
  if (errors && typeof errors === "object") {
    const first = Object.values(errors).flat().find((m) => typeof m === "string" && m.trim())
    if (first) return first
  }
  const status = error?.response?.status
  if (status === 403) return t("purchase.errorForbidden", "لا يمكن إتمام هذه العملية.")
  if (status === 401) return t("purchase.errorAuth", "انتهت الجلسة. سجّل الدخول مجددًا.")
  if (status === 422) return t("purchase.errorValidation", "تعذّر إتمام الشراء. تحقق من الرصيد والبيانات.")
  if (error?.message && typeof error.message === "string") return error.message
  return t("common.error")
}

/** Strip spaces; accept +9665… / 9665… and normalize to 05xxxxxxxx */
export function normalizeSaudiPhone(raw) {
  let s = String(raw ?? "")
    .trim()
    .replace(/[\s-]/g, "")
  if (!s) return ""
  if (s.startsWith("+966")) s = `0${s.slice(4)}`
  else if (s.startsWith("966")) s = `0${s.slice(3)}`
  return s
}

/** Client-side checkout rules (mirrors backend max lengths where applicable). */
export function getPurchaseFieldErrors(
  { buyerName, buyerPhone, quantity, buyerNote, shippingAddress, paymentMethod },
  t,
) {
  const errors = {}

  const name = String(buyerName ?? "").trim()
  if (!name) {
    errors.buyerName = t("purchase.validation.nameRequired", "Please enter your name.")
  } else if (name.length < 2) {
    errors.buyerName = t("purchase.validation.nameMin", "Name must be at least 2 characters.")
  } else if (name.length > 255) {
    errors.buyerName = t("purchase.validation.nameMax", "Name is too long (max 255).")
  }

  const phoneRaw = String(buyerPhone ?? "").trim()
  if (!phoneRaw) {
    errors.buyerPhone = t("purchase.validation.phoneRequired", "Phone number is required.")
  } else {
    const phoneNorm = normalizeSaudiPhone(buyerPhone)
    if (!/^05\d{8}$/.test(phoneNorm)) {
      errors.buyerPhone = t(
        "purchase.validation.phoneFormat",
        "Use a Saudi mobile number, e.g. 05xxxxxxxx.",
      )
    }
  }

  const qRaw = quantity === "" || quantity == null ? "" : String(quantity).trim()
  if (qRaw === "") {
    errors.quantity = t("purchase.validation.quantityRequired", "Enter a quantity.")
  } else {
    const qNum = Number(quantity)
    if (!Number.isFinite(qNum) || !Number.isInteger(qNum)) {
      errors.quantity = t("purchase.validation.quantityInteger", "Quantity must be a whole number.")
    } else if (qNum < 1 || qNum > 999) {
      errors.quantity = t("purchase.validation.quantityRange", "Quantity must be between 1 and 999.")
    }
  }

  const note = String(buyerNote ?? "")
  if (note.length > 2000) {
    errors.buyerNote = t("purchase.validation.noteMax", "Notes are too long (max 2000 characters).")
  }

  const addr = String(shippingAddress ?? "").trim()
  if (addr.length > 500) {
    errors.shippingAddress = t("purchase.validation.addressMax", "Address is too long (max 500 characters).")
  } else if (paymentMethod === "cod" && addr.length < 5) {
    errors.shippingAddress = t(
      "purchase.validation.addressCodMin",
      "For cash on delivery, enter a full shipping address (at least 5 characters).",
    )
  }

  return errors
}

export function PurchasePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation()
  const { user, token } = useAuthStore()

  const [paymentMethod, setPaymentMethod] = useState("escrow")
  const [shippingAddress, setShippingAddress] = useState("")
  const [shippingLat, setShippingLat] = useState("")
  const [shippingLng, setShippingLng] = useState("")
  const [buyerPhone, setBuyerPhone] = useState(user?.phone ?? "")
  const [buyerName, setBuyerName] = useState(user?.name ?? "")
  const [quantity, setQuantity] = useState(1)
  const [buyerNote, setBuyerNote] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [redirectToLogin, setRedirectToLogin] = useState(false)
  const addressRef = useRef(null)

  const { data: product, isLoading, isError, error } = useQuery({
    queryKey: ["product", id, i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get(`/listings/${id}`)
      return data?.data
    },
    enabled: Boolean(id),
  })

  const { data: balancePayload } = useQuery({
    queryKey: ["account", "balance"],
    queryFn: async () => {
      const { data } = await apiClient.get("/account/balance")
      return data?.data
    },
    enabled: Boolean(token && id),
  })

  const allowCod = product?.allow_cod !== false

  useEffect(() => {
    if (product && product.allow_cod === false && paymentMethod === "cod") {
      setPaymentMethod("escrow")
    }
  }, [product, paymentMethod])

  useEffect(() => {
    if (!token) {
      setRedirectToLogin(true)
    }
  }, [token])

  const purchaseMutation = useMutation({
    mutationFn: (payload) => {
      const productId = product?.id
      if (productId == null) {
        return Promise.reject(new Error("missing_product"))
      }
      return apiClient.post(`/products/${productId}/purchase`, payload)
    },
    onSuccess: async (response) => {
      const productId = product?.id ?? id
      queryClient.invalidateQueries({ queryKey: ["product", id] })
      queryClient.invalidateQueries({ queryKey: ["product", String(productId)] })
      queryClient.invalidateQueries({ queryKey: ["account", "balance"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
      await queryClient.invalidateQueries({ queryKey: ["account", "orders"] })
      const created = response?.data?.data
      const newOrderId = created?.id
      if (newOrderId != null) {
        await queryClient.invalidateQueries({ queryKey: ["account", "orders", String(newOrderId)] })
      }
      const method = created?.payment_method
      const methodLabel = method === "cod"
        ? t("purchase.cod", "الدفع عند الاستلام")
        : t("purchase.escrow", "الدفع عبر المنصة")
      toast.success(`${t("purchase.invoiceIssued", "تم إصدار الفاتورة")} — ${methodLabel}`)
      setConfirmOpen(false)
      if (newOrderId != null) {
        navigate(`/dashboard/orders/${newOrderId}`)
      } else {
        navigate("/dashboard/orders")
      }
    },
    onError: (err) => {
      setConfirmOpen(false)
      if (err?.message === "missing_product") {
        toast.error(t("purchase.errorNoProduct", "تعذّر تحميل المنتج. أعد تحميل الصفحة."))
        return
      }
      toast.error(purchaseErrorMessage(err, t))
    },
  })

  const purchaseFieldErrors = useMemo(
    () =>
      getPurchaseFieldErrors(
        {
          buyerName,
          buyerPhone,
          quantity,
          buyerNote,
          shippingAddress,
          paymentMethod,
        },
        t,
      ),
    [buyerName, buyerPhone, quantity, buyerNote, shippingAddress, paymentMethod, t],
  )
  const purchaseFormInvalid = Object.keys(purchaseFieldErrors).length > 0

  if (redirectToLogin) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
        <p className="text-sm text-destructive">
          {error?.response?.data?.message ?? t("common.error")}
        </p>
        <Button variant="outline" onClick={() => navigate(`/products/${id}`)}>
          {t("common.back")}
        </Button>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
        <p className="text-sm text-muted-foreground">{t("common.noResults")}</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          {t("common.back")}
        </Button>
      </div>
    )
  }

  const hasPrice = product?.price != null && product?.price > 0
  const isOffer = product?.type === "offer"
  const isOwner = user?.id === product?.seller?.id

  if (!hasPrice || !isOffer || isOwner) {
    return <Navigate to={`/products/${id}`} replace />
  }

  const priceAmount = Number(product?.price ?? 0)
  const qty = Math.min(999, Math.max(1, Math.floor(Number(quantity)) || 1))
  const lineTotal = priceAmount > 0 ? Math.round(priceAmount * qty * 100) / 100 : 0
  const availableBalance = Number(balancePayload?.available ?? 0)
  const escrowShortfall =
    paymentMethod === "escrow" && lineTotal > 0 ? Math.max(0, lineTotal - availableBalance) : 0
  const escrowBlocked = paymentMethod === "escrow" && escrowShortfall > 0

  const buyerPhoneNormalized = normalizeSaudiPhone(buyerPhone)

  const handleConfirmPurchase = () => {
    if (purchaseMutation.isPending || product?.id == null) return
    if (purchaseFormInvalid) {
      toast.error(t("purchase.validation.fixForm", "Please fix the highlighted fields."))
      return
    }
    if (shippingLat === "" || shippingLng === "") {
      toast.error(t("purchase.mapPinRequired", "حدّد موقع المعاينة على الخريطة"))
      return
    }
    purchaseMutation.mutate({
      payment_method: paymentMethod,
      quantity: qty,
      shipping_address: shippingAddress?.trim() ? shippingAddress.trim() : null,
      shipping_lat: Number(shippingLat),
      shipping_lng: Number(shippingLng),
      buyer_note: buyerNote?.trim() ? buyerNote.trim() : null,
      buyer_phone: buyerPhoneNormalized || user?.phone,
      buyer_email: user?.email,
      buyer_name: buyerName?.trim() ? buyerName.trim() : user?.name,
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ShoppingCart className="size-7" />
        {t("purchase.title", "اشتر الآن")}
      </h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (purchaseFormInvalid || escrowBlocked) return
          setConfirmOpen(true)
        }}
        className="space-y-6"
      >
        {/* Invoice / Order details */}
        <Card>
          <CardHeader>
            <CardTitle>{t("purchase.invoice", "الفاتورة وتفاصيل الطلب")}</CardTitle>
            <CardDescription>{t("purchase.invoiceDescription", "تفاصيل المنتج والطلب")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 rounded-lg border p-4">
              {product?.media?.image_url && (
                <img
                  src={resolveImageUrl(product.media.image_url)}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{product?.title}</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {formatPrice(product?.price, t)}
                </p>
                {product?.seller?.name && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("purchase.sellerLabel", "البائع")}: {product.seller.name}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("purchase.quantity", "الكمية")}</Label>
              <Input
                type="number"
                min={1}
                max={999}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="max-w-[8rem]"
                aria-invalid={Boolean(purchaseFieldErrors.quantity)}
              />
              {purchaseFieldErrors.quantity ? (
                <p className="text-sm text-destructive">{purchaseFieldErrors.quantity}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>{t("purchase.buyerName", "الاسم")}</Label>
              <Input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder={t("auth.namePlaceholder")}
                aria-invalid={Boolean(purchaseFieldErrors.buyerName)}
              />
              {purchaseFieldErrors.buyerName ? (
                <p className="text-sm text-destructive">{purchaseFieldErrors.buyerName}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>{t("purchase.buyerPhone", "رقم الجوال")}</Label>
              <Input
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                aria-invalid={Boolean(purchaseFieldErrors.buyerPhone)}
              />
              {purchaseFieldErrors.buyerPhone ? (
                <p className="text-sm text-destructive">{purchaseFieldErrors.buyerPhone}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>
                {t("purchase.shippingAddress", "عنوان الشحن")}
                {paymentMethod === "cod"
                  ? ` (${t("purchase.shippingRequiredForCod", "Required for cash on delivery")})`
                  : ` (${t("common.optional")})`}
              </Label>
              <Input
                ref={addressRef}
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder={t("purchase.addressPlaceholder", "المدينة، الحي، الشارع")}
                aria-invalid={Boolean(purchaseFieldErrors.shippingAddress)}
              />
              {purchaseFieldErrors.shippingAddress ? (
                <p className="text-sm text-destructive">{purchaseFieldErrors.shippingAddress}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("purchase.mapSelectLabel", "موقع المعاينة على الخريطة")}</Label>
              <Suspense
                fallback={
                  <Skeleton className="flex h-[220px] w-full items-center justify-center rounded-md border border-border text-xs text-muted-foreground">
                    {t("common.loading", "جار التحميل...")}
                  </Skeleton>
                }
              >
                <LocationMapPicker
                  key={`purchase-map-${product?.id ?? "new"}`}
                  language={i18n.language}
                  lat={shippingLat === "" ? null : Number(shippingLat)}
                  lng={shippingLng === "" ? null : Number(shippingLng)}
                  addressInputRef={addressRef}
                  onReverseGeocode={(addr) => {
                    if (!addr) return
                    setShippingAddress(addr)
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
            </div>
            <div className="space-y-2">
              <Label>{t("purchase.buyerNote", "ملاحظات الطلب (اختياري)")}</Label>
              <Textarea
                value={buyerNote}
                onChange={(e) => setBuyerNote(e.target.value)}
                placeholder={t("purchase.buyerNotePlaceholder", "")}
                rows={3}
                className="resize-y min-h-[4rem]"
                aria-invalid={Boolean(purchaseFieldErrors.buyerNote)}
              />
              {purchaseFieldErrors.buyerNote ? (
                <p className="text-sm text-destructive">{purchaseFieldErrors.buyerNote}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("purchase.orderSummary", "ملخص الطلب")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("purchase.unitPrice", "سعر الوحدة")}</span>
              <span className="font-semibold">{formatPrice(product?.price, t)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("purchase.quantity", "الكمية")}</span>
              <span className="font-semibold tabular-nums">× {qty}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("purchase.lineSubtotal", "المجموع الفرعي")}</span>
              <span className="font-semibold">{formatPrice(lineTotal, t)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("purchase.selectedPayment", "طريقة الدفع المختارة")}</span>
              <span className="font-semibold">
                {paymentMethod === "cod"
                  ? t("purchase.cod", "الدفع عند الاستلام")
                  : t("purchase.escrow", "الدفع عبر المنصة")}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2 text-base">
              <span className="font-semibold">{t("purchase.invoiceTotal", "إجمالي الفاتورة")}</span>
              <span className="font-bold text-primary">{formatPrice(lineTotal, t)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment method */}
        <Card>
          <CardHeader>
            <CardTitle>{t("purchase.paymentMethod", "طريقة الدفع")}</CardTitle>
            <CardDescription>{t("purchase.paymentMethodDescription", "اختر طريقة الدفع")}</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
              <div className="flex items-start space-x-3 space-x-reverse rounded-lg border p-4 has-[[data-state=checked]]:border-primary">
                <RadioGroupItem value="escrow" id="escrow" />
                <Label htmlFor="escrow" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <Wallet className="size-5" />
                    {t("purchase.escrow", "الدفع عبر المنصة")}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("purchase.escrowDescription", "يتم شحن الرصيد واحتفاظ المبلغ حتى استلام المنتج")}
                  </p>
                </Label>
              </div>
              {allowCod ? (
                <div className="flex items-start space-x-3 space-x-reverse rounded-lg border p-4 has-[[data-state=checked]]:border-primary">
                  <RadioGroupItem value="cod" id="cod" />
                  <Label htmlFor="cod" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 font-semibold">
                      <Package className="size-5" />
                      {t("purchase.cod", "الدفع عند الاستلام")}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("purchase.codDescription", "ادفع عند وصول المنتج — مثل أمازون أو مستقل")}
                    </p>
                  </Label>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("purchase.codNotAllowed", "Cash on delivery is not offered for this listing.")}</p>
              )}
            </RadioGroup>
            {paymentMethod === "escrow" && (
              <div className="mt-4 rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">
                    {t("purchase.availableBalance", "رصيدك المتاح")}
                  </span>
                  <span className="font-semibold tabular-nums">{formatPrice(availableBalance, t)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">
                    {t("purchase.requiredForOrder", "المطلوب لهذا الطلب")}
                  </span>
                  <span className="font-semibold tabular-nums">{formatPrice(lineTotal, t)}</span>
                </div>
                {escrowBlocked ? (
                  <p className="text-destructive pt-1">
                    {t("purchase.insufficientBalance", "الرصيد غير كافٍ. شحن الرصيد من المحفظة ثم أعد المحاولة.")}{" "}
                    <Link
                      to="/dashboard/balance"
                      className="font-medium underline underline-offset-2 text-primary"
                    >
                      {t("purchase.openWallet", "فتح المحفظة")}
                    </Link>
                  </p>
                ) : (
                  <p className="text-muted-foreground pt-1">
                    {t(
                      "purchase.escrowHoldHint",
                      "بعد الشراء يُحجز المبلغ في الضمان حتى يشحن البائع ثم تؤكد الاستلام.",
                    )}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trust badge */}
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-4 text-sm">
          <Shield className="size-5 shrink-0 text-primary" />
          <span>{t("purchase.trustMessage", "كن مطمئن — مدفوعات آمنة، استرداد في حال عدم الاستلام")}</span>
        </div>

        {purchaseMutation.isError && (
          <p className="text-sm text-destructive">
            {purchaseErrorMessage(purchaseMutation.error, t)}
          </p>
        )}

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/products/${id}`)}
            disabled={purchaseMutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={purchaseMutation.isPending || purchaseFormInvalid || escrowBlocked || shippingLat === "" || shippingLng === ""}
          >
            {purchaseMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShoppingCart className="size-4" />
            )}
            {t("purchase.confirm", "تأكيد الشراء")}
          </Button>
        </div>
      </form>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("purchase.confirmReceiptTitle", "تأكيد الطلب؟")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("purchase.invoiceIssued", "سيتم إصدار الفاتورة")} —{" "}
              {paymentMethod === "cod"
                ? t("purchase.cod", "الدفع عند الاستلام")
                : t("purchase.escrow", "الدفع عبر المنصة")}
              {" "}
              {paymentMethod === "escrow"
                ? t("purchase.confirmDialogEscrowNote", "المبلغ يُحجز لدى المنصة حتى يشحن البائع وتؤكد الاستلام؛ عندها يُضاف للبائع.")
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={purchaseMutation.isPending || purchaseFormInvalid}
              onClick={(e) => {
                e.preventDefault()
                handleConfirmPurchase()
              }}
            >
              {purchaseMutation.isPending
                ? t("common.loading", "Loading...")
                : t("purchase.confirm", "تأكيد الشراء")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
