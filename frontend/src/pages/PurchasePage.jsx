import { Suspense, useState, useEffect, useMemo } from "react"
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
import { StandardLocationMapField } from "@/components/maps/StandardLocationMapField"
import { SaudiMobilePhoneField } from "@/components/phone/SaudiMobilePhoneField"
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
import { fetchCheckoutPaymentOptions, fetchPaymentFields } from "@/services/financeService"
import { DynamicFormRenderer } from "@/components/finance/DynamicFormRenderer"
import { SellerBankDetailsCard } from "@/components/finance/SellerBankDetailsCard"
import { mapFinanceApiErrors, validateDynamicFormFields } from "@/lib/finance/dynamicFieldErrors"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuthStore } from "@/store/useAuthStore"
import { ShoppingCart, Loader2, Wallet, Package, Shield, Landmark, MessageSquare, ArrowLeft, Info } from "lucide-react"
import { resolveImageUrl } from "@/lib/imageUrl"
import { toast } from "sonner"
import { useFinanceModules, isPaymentsUiVisible } from "@/hooks/useFinanceModules"
import { useAppDirection } from "@/providers/DirectionProvider"
import { publicProfilePath } from "@/lib/profileRoutes"
import {
  getPurchaseFieldErrors,
  normalizeSaudiPhone,
  purchaseErrorMessage,
} from "@/lib/purchaseCheckoutValidation"
import {
  getPurchaseConfirmDialogNote,
  getPurchasePaymentMethodLabel,
  getPurchaseSuccessToast,
  PURCHASE_PAYMENT_UI,
} from "@/lib/purchasePaymentLabels"

const formatPrice = (price, t) => {
  if (price == null) return null
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(price)
}

const PAYMENT_UI = {
  escrow: {
    Icon: Wallet,
    ...PURCHASE_PAYMENT_UI.escrow,
    descKey: "purchase.escrowDescription",
    descDefault: "يتم شحن الرصيد واحتفاظ المبلغ حتى استلام المنتج",
  },
  cod: {
    Icon: Package,
    ...PURCHASE_PAYMENT_UI.cod,
    descKey: "purchase.codDescription",
    descDefault: "ادفع عند وصول المنتج — مثل أمازون أو مستقل",
  },
  direct_transfer: {
    Icon: Landmark,
    ...PURCHASE_PAYMENT_UI.direct_transfer,
    descKey: "purchase.directTransferDescription",
    descDefault: "حوّل المبلغ إلى حساب البائع ثم أرفق إيصال التحويل",
  },
}

function PurchasePageShell({ title, onBack, sidebar, children }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()

  return (
    <div dir={direction} className="min-h-screen bg-background">
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-24 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <article className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center border-b border-border px-2 py-2 sm:px-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 min-h-[44px] text-base"
              onClick={onBack}
            >
              <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
              {t("common.back", "رجوع")}
            </Button>
          </div>
          <div className="border-b border-border px-4 py-4 sm:px-6">
            <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
              <ShoppingCart className="size-6 shrink-0 sm:size-7" aria-hidden />
              {title}
            </h1>
          </div>
          <div className="p-4 sm:p-6">{children}</div>
        </article>
        {sidebar ? (
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">{sidebar}</aside>
        ) : null}
      </main>
    </div>
  )
}

function PurchaseProductSidebar({ product, listingId, t, children }) {
  const imageUrl =
    product?.media?.image_url ?? product?.media?.cover ?? product?.media?.gallery?.[0]
  const sellerProfile = publicProfilePath(product?.seller)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="space-y-4 p-4 sm:p-5">
        {imageUrl ? (
          <div className="aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
            <img
              src={resolveImageUrl(imageUrl)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-snug">{product?.title}</h2>
          <p className="mt-2 text-2xl font-bold text-primary">{formatPrice(product?.price, t)}</p>
          {product?.seller?.name ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {t("purchase.sellerLabel", "البائع")}:{" "}
              {sellerProfile ? (
                <Link to={sellerProfile} className="font-medium text-primary hover:underline">
                  {product.seller.name}
                </Link>
              ) : (
                product.seller.name
              )}
            </p>
          ) : null}
        </div>
        {children}
        <Button variant="outline" className="w-full" asChild>
          <Link to={`/products/${listingId}`}>
            {t("purchase.viewListing", "عرض الإعلان")}
          </Link>
        </Button>
      </div>
    </div>
  )
}

function PurchaseOrderSummaryCard({ product, qty, lineTotal, paymentMethodLabel, t }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2 text-sm">
      <p className="font-semibold text-base">{t("purchase.orderSummary", "ملخص الطلب")}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">{t("purchase.unitPrice", "سعر الوحدة")}</span>
        <span className="font-semibold">{formatPrice(product?.price, t)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">{t("purchase.quantity", "الكمية")}</span>
        <span className="font-semibold tabular-nums">× {qty}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">{t("purchase.lineSubtotal", "المجموع الفرعي")}</span>
        <span className="font-semibold">{formatPrice(lineTotal, t)}</span>
      </div>
      {paymentMethodLabel ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{t("purchase.selectedPayment", "طريقة الدفع المختارة")}</span>
          <span className="font-semibold text-end">{paymentMethodLabel}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-2 text-base">
        <span className="font-semibold">{t("purchase.invoiceTotal", "إجمالي الفاتورة")}</span>
        <span className="font-bold text-primary">{formatPrice(lineTotal, t)}</span>
      </div>
    </div>
  )
}

export function PurchasePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation()
  const { user, token } = useAuthStore()
  const { data: financeModules, isLoading: modulesLoading } = useFinanceModules()
  const paymentsEnabled = isPaymentsUiVisible(financeModules)

  const [paymentMethod, setPaymentMethod] = useState("escrow")
  const [shippingAddress, setShippingAddress] = useState("")
  const [shippingLat, setShippingLat] = useState("")
  const [shippingLng, setShippingLng] = useState("")
  const [buyerPhone, setBuyerPhone] = useState(user?.phone ?? "")
  const [buyerName, setBuyerName] = useState(user?.name ?? "")
  const [quantity, setQuantity] = useState(1)
  const [buyerNote, setBuyerNote] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [codAccepted, setCodAccepted] = useState(false)
  const [paymentFields, setPaymentFields] = useState({})
  const [paymentFieldErrors, setPaymentFieldErrors] = useState({})
  const [redirectToLogin, setRedirectToLogin] = useState(false)
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

  const productIdForCheckout = product?.id

  const { data: checkoutOptions = [] } = useQuery({
    queryKey: ["checkout-payment-options", productIdForCheckout],
    queryFn: () => fetchCheckoutPaymentOptions(productIdForCheckout),
    enabled: Boolean(productIdForCheckout && token),
  })

  const allowedMethods = checkoutOptions.map((o) => o.legacy_code)
  const selectedOption = checkoutOptions.find((o) => o.legacy_code === paymentMethod)
  const codRequiresAccept = selectedOption?.buyer_must_accept

  const { data: orderPaymentFieldDefs = [] } = useQuery({
    queryKey: ["payment-fields", "order_payment", "direct_transfer"],
    queryFn: () => fetchPaymentFields("order_payment", "direct_transfer"),
    enabled: paymentMethod === "direct_transfer",
  })

  useEffect(() => {
    if (allowedMethods.length && !allowedMethods.includes(paymentMethod)) {
      setPaymentMethod(allowedMethods[0])
    }
  }, [allowedMethods, paymentMethod])

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
      toast.success(getPurchaseSuccessToast(created?.payment_method, t))
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
      const mapped = mapFinanceApiErrors(err, t)
      if (Object.keys(mapped).length) {
        setPaymentFieldErrors(mapped)
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

  const orderPaymentErrors = useMemo(() => {
    if (paymentMethod !== "direct_transfer" || !orderPaymentFieldDefs.length) return {}
    return validateDynamicFormFields(orderPaymentFieldDefs, paymentFields, t)
  }, [paymentMethod, orderPaymentFieldDefs, paymentFields, t])

  const mergedPurchaseErrors = useMemo(
    () => ({ ...purchaseFieldErrors, ...paymentFieldErrors, ...orderPaymentErrors }),
    [purchaseFieldErrors, paymentFieldErrors, orderPaymentErrors],
  )

  const purchaseFormInvalid = Object.keys(mergedPurchaseErrors).length > 0

  if (redirectToLogin) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return (
      <PurchasePageShell
        title={t("purchase.title", "اشتر الآن")}
        onBack={() => navigate(`/products/${id}`)}
      >
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="mt-4 h-40 w-full rounded-lg" />
      </PurchasePageShell>
    )
  }

  if (isError) {
    return (
      <PurchasePageShell
        title={t("purchase.title", "اشتر الآن")}
        onBack={() => navigate(`/products/${id}`)}
      >
        <p className="text-sm text-destructive">
          {error?.response?.data?.message ?? t("common.error")}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(`/products/${id}`)}>
          {t("common.back")}
        </Button>
      </PurchasePageShell>
    )
  }

  if (!product) {
    return (
      <PurchasePageShell
        title={t("purchase.title", "اشتر الآن")}
        onBack={() => navigate("/")}
      >
        <p className="text-sm text-muted-foreground">{t("common.noResults")}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
          {t("common.back")}
        </Button>
      </PurchasePageShell>
    )
  }

  const hasPrice = product?.price != null && product?.price > 0
  const isOffer = product?.type === "offer"
  const isOwner = user?.id === product?.seller?.id

  if (!hasPrice || !isOffer || isOwner) {
    return <Navigate to={`/products/${id}`} replace />
  }

  const sellerId = product?.seller?.id

  if (!modulesLoading && !paymentsEnabled) {
    return (
      <PurchasePageShell
        title={t("purchase.title", "اشتر الآن")}
        onBack={() => navigate(`/products/${id}`)}
        sidebar={
          <PurchaseProductSidebar product={product} listingId={id} t={t}>
            {sellerId ? (
              <Button asChild className="w-full gap-2" size="lg">
                <Link to={`/dashboard/messages?with=${sellerId}`}>
                  <MessageSquare className="size-4" />
                  {t("bids.messageSeller", "مراسلة البائع")}
                </Link>
              </Button>
            ) : null}
          </PurchaseProductSidebar>
        }
      >
        <div className="space-y-6">
          <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
            <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p className="text-sm leading-relaxed text-foreground/90 sm:text-base">
              {t("finance.modules.paymentsDisabledMessage")}
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
            <h2 className="text-base font-semibold sm:text-lg">
              {t("purchase.messagesOnlyHowTitle", "كيف تكمل الصفقة؟")}
            </h2>
            <ol className="list-decimal space-y-2 ps-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <li>{t("purchase.messagesOnlyStep1", "اضغط «مراسلة البائع» وافتح محادثة خاصة.")}</li>
              <li>{t("purchase.messagesOnlyStep2", "اتفق مع البائع على السعر وطريقة الدفع والتسليم.")}</li>
              <li>{t("purchase.messagesOnlyStep3", "لا تشارك بيانات حساسة إلا بعد التأكد من موثوقية الطرف الآخر.")}</li>
            </ol>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {sellerId ? (
              <Button asChild size="lg" className="gap-2 sm:min-w-[200px]">
                <Link to={`/dashboard/messages?with=${sellerId}`}>
                  <MessageSquare className="size-4" />
                  {t("bids.messageSeller", "مراسلة البائع")}
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" size="lg" onClick={() => navigate(`/products/${id}`)}>
              {t("purchase.viewListing", "عرض الإعلان")}
            </Button>
          </div>
        </div>
      </PurchasePageShell>
    )
  }

  const priceAmount = Number(product?.price ?? 0)
  const qty = Math.min(999, Math.max(1, Math.floor(Number(quantity)) || 1))
  const lineTotal = priceAmount > 0 ? Math.round(priceAmount * qty * 100) / 100 : 0
  const availableBalance = Number(balancePayload?.available ?? 0)
  const escrowShortfall =
    paymentMethod === "escrow" && lineTotal > 0 ? Math.max(0, lineTotal - availableBalance) : 0
  const escrowBlocked = paymentMethod === "escrow" && escrowShortfall > 0
  const directTransferOption = checkoutOptions.find((o) => o.legacy_code === "direct_transfer")
  const sellerBank = directTransferOption?.seller_bank
  const paymentUi = PAYMENT_UI[paymentMethod]
  const paymentMethodLabel = paymentUi
    ? t(paymentUi.titleKey, paymentUi.titleDefault)
    : getPurchasePaymentMethodLabel(paymentMethod, t)

  const buyerPhoneNormalized = normalizeSaudiPhone(buyerPhone)

  const handleConfirmPurchase = () => {
    if (purchaseMutation.isPending || product?.id == null) return
    if (purchaseFormInvalid) {
      setPaymentFieldErrors(orderPaymentErrors)
      toast.error(t("purchase.validation.fixForm", "Please fix the highlighted fields."))
      return
    }
    setPaymentFieldErrors({})
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
      cod_accepted: codRequiresAccept ? codAccepted : undefined,
      payment_fields: paymentMethod === "direct_transfer" ? paymentFields : undefined,
    })
  }

  return (
    <PurchasePageShell
      title={t("purchase.title", "اشتر الآن")}
      onBack={() => navigate(`/products/${id}`)}
      sidebar={
        <PurchaseProductSidebar product={product} listingId={id} t={t}>
          <PurchaseOrderSummaryCard
            product={product}
            qty={qty}
            lineTotal={lineTotal}
            paymentMethodLabel={paymentMethodLabel}
            t={t}
          />
        </PurchaseProductSidebar>
      }
    >
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
              <Label htmlFor="purchase-buyer-phone">{t("purchase.buyerPhone", "رقم الجوال")}</Label>
              <SaudiMobilePhoneField
                id="purchase-buyer-phone"
                value={buyerPhone}
                onChange={setBuyerPhone}
                error={purchaseFieldErrors.buyerPhone}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {t("purchase.shippingAddress", "عنوان الشحن")}
                {paymentMethod === "cod"
                  ? ` (${t("purchase.shippingRequiredForCod", "Required for cash on delivery")})`
                  : ` (${t("common.optional")})`}
              </Label>
              <Input
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
                <StandardLocationMapField
                  key={`purchase-map-${product?.id ?? "new"}`}
                  language={i18n.language}
                  lat={shippingLat === "" ? null : Number(shippingLat)}
                  lng={shippingLng === "" ? null : Number(shippingLng)}
                  address={shippingAddress}
                  searchPlaceholder={t("purchase.addressPlaceholder", "المدينة، الحي، الشارع")}
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

        {/* Payment method */}
        <Card>
          <CardHeader>
            <CardTitle>{t("purchase.paymentMethod", "طريقة الدفع")}</CardTitle>
            <CardDescription>{t("purchase.paymentMethodDescription", "اختر طريقة الدفع")}</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
              {checkoutOptions.map((opt) => {
                const code = opt.legacy_code
                const ui = PAYMENT_UI[code]
                if (!ui) return null
                const Icon = ui.Icon
                const inputId = `pay-${code}`
                return (
                  <div
                    key={code}
                    className="flex items-start space-x-3 space-x-reverse rounded-lg border p-4 has-[[data-state=checked]]:border-primary"
                  >
                    <RadioGroupItem value={code} id={inputId} />
                    <Label htmlFor={inputId} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 font-semibold">
                        <Icon className="size-5" />
                        {opt.name || t(ui.titleKey, ui.titleDefault)}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{t(ui.descKey, ui.descDefault)}</p>
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
            {paymentMethod === "direct_transfer" && sellerBank ? (
              <SellerBankDetailsCard
                sellerBank={sellerBank}
                transferAmountLabel={
                  lineTotal > 0
                    ? t("purchase.transferAmount", "المبلغ المطلوب تحويله: {{amount}}", {
                        amount: formatPrice(lineTotal, t),
                      })
                    : null
                }
              />
            ) : null}
            {paymentMethod === "cod" && codRequiresAccept ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border p-3">
                <Checkbox id="cod-accept" checked={codAccepted} onCheckedChange={(v) => setCodAccepted(Boolean(v))} />
                <Label htmlFor="cod-accept" className="text-sm leading-relaxed">
                  {t("purchase.codAcceptTerms", "I accept cash-on-delivery terms.")}
                </Label>
              </div>
            ) : null}
            {paymentMethod === "direct_transfer" && orderPaymentFieldDefs.length > 0 ? (
              <div className="mt-4">
                <DynamicFormRenderer
                  fields={orderPaymentFieldDefs}
                  values={paymentFields}
                  errors={{ ...paymentFieldErrors, ...orderPaymentErrors }}
                  onChange={(key, value) => {
                    setPaymentFields((prev) => ({ ...prev, [key]: value }))
                    setPaymentFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next[key]
                      return next
                    })
                  }}
                />
              </div>
            ) : null}
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
                      to="/dashboard/wallet"
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
              {t("purchase.confirmOrderIntro", "سيتم إصدار الفاتورة")} —{" "}
              {getPurchasePaymentMethodLabel(paymentMethod, t)}
              {" "}
              {getPurchaseConfirmDialogNote(paymentMethod, t)}
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
    </PurchasePageShell>
  )
}
