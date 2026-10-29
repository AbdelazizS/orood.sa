import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { resolveImageUrl } from "@/lib/imageUrl"
import { Package, Truck, CheckCircle2, Loader2, ExternalLink, ChevronRight, PackageCheck, Handshake, Star, Info, Phone, Banknote } from "lucide-react"
import { LeaveReviewModal } from "@/components/reviews/LeaveReviewModal"
import { LocationMapPreview } from "@/components/maps/LocationMapPreview"
import { StandardLocationMapField } from "@/components/maps/StandardLocationMapField"
import { normalizeLatLng } from "@/lib/maps/urls"
import { toast } from "sonner"

function orderMutationErrorMessage(error, t) {
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
  if (status === 403) return t("orders.mutationErrorForbidden", "غير مسموح بهذه العملية.")
  if (status === 401) return t("orders.mutationErrorAuth", "انتهت الجلسة. سجّل الدخول مجددًا.")
  if (status === 422) return t("orders.mutationErrorValidation", "تعذّر إتمام الطلب. تحقق من الحالة والبيانات.")
  if (error?.message && typeof error.message === "string") return error.message
  return t("common.error")
}

const statusColors = {
  pending: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  cod_requested: "bg-amber-500/20 text-amber-800 dark:text-amber-300",
  paid: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  awaiting_payment: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  shipped: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400",
  delivered: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  completed: "bg-green-500/20 text-green-700 dark:text-green-400",
  cancelled: "bg-muted text-muted-foreground",
  disputed: "bg-destructive/15 text-destructive",
}

/** How many of the 4 unified steps are fully completed (1–4). */
function orderProgressCompletedCount(order) {
  const { status, payment_method: pm } = order
  if (status === "cancelled" || status === "disputed") return 0
  if (pm === "cod") {
    if (status === "cod_requested") return 1
    if (status === "pending") return 2
    if (status === "shipped") return 3
    if (status === "delivered" || status === "completed") return 4
    return 0
  }
  if (pm === "escrow" || pm === "balance") {
    if (status === "awaiting_payment" || status === "paid") return 2
    if (status === "shipped") return 3
    if (status === "delivered" || status === "completed") return 4
    return 1
  }
  if (pm === "direct_transfer") {
    if (status === "awaiting_payment") return 1
    if (status === "pending" && !order.seller_transfer_confirmed_at) return 1
    if (status === "pending") return 2
    if (status === "shipped") return 3
    if (status === "delivered" || status === "completed") return 4
    return 1
  }
  return 0
}

function step2Subtitle(order, t) {
  const isEscrowLike = order.payment_method === "escrow" || order.payment_method === "balance"
  if (isEscrowLike) {
    return t("orders.progressConfirmedEscrowSub", "المبلغ محجوز لدى المنصة")
  }
  if (order.payment_method === "direct_transfer") {
    if (order.seller_transfer_confirmed_at) {
      return t("orders.progressConfirmedDirectSellerSub", "البائع أكّد استلام التحويل")
    }
    return t("orders.progressAwaitingSellerConfirmSub", "بانتظار تأكيد البائع لاستلام التحويل")
  }
  return t("orders.progressConfirmedCodSub", "البائع قبل الدفع عند الاستلام")
}

function OrderStatusTimeline({ order, t }) {
  const s = order.status
  if (s === "cancelled" || s === "disputed") {
    return (
      <p className="text-sm text-muted-foreground">
        {t("orders.timelineNotActive", "لا يعرض مسار التسليم لهذه الحالة.")}
      </p>
    )
  }

  const isEscrowLike = order.payment_method === "escrow" || order.payment_method === "balance"
  const isDirectTransfer = order.payment_method === "direct_transfer"
  const steps = [
    {
      id: 1,
      label: t("orders.progressPlaced", "تم إنشاء الطلب"),
      subtitle: t("orders.progressPlacedSub", "المشتري"),
    },
    {
      id: 2,
      label: isDirectTransfer
        ? t("orders.progressConfirmed", "تم التحقق / التأكيد")
        : t("orders.progressConfirmed", "تم التأكيد"),
      subtitle: step2Subtitle(order, t),
    },
    {
      id: 3,
      label: t("orders.progressShipped", "تم الشحن"),
      subtitle: t("orders.progressShippedSub", "البائع يضيف التتبع"),
    },
    {
      id: 4,
      label: t("orders.progressDelivered", "تم التسليم"),
      subtitle: t("orders.progressDeliveredSub", "المشتري يستلم…"),
    },
  ]

  const completed = orderProgressCompletedCount(order)
  const nextStep = completed < 4 ? completed + 1 : null

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-sm font-medium mb-3">{t("orders.timelineTitle", "مسار الطلب")}</p>
      <p className="text-xs text-muted-foreground mb-4">
        {isEscrowLike
          ? t(
              "orders.timelineEscrowExplain",
              "مع الدفع عبر المنصة يبقى المبلغ محجوزًا حتى تؤكد الاستلام؛ عندها يُضاف للبائع في رصيده القابل للسحب.",
            )
          : isDirectTransfer
            ? t(
                "orders.timelineDirectExplain",
                "مع التحويل البنكي المباشر يرفع المشتري السند عند الشراء، ويؤكد البائع استلام المبلغ قبل الشحن.",
              )
            : t(
                "orders.timelineCodExplain",
                "مع الدفع عند الاستلام تدفع للبائع عند الاستلام؛ تأكيد الاستلام يحدّث حالة الطلب.",
              )}
      </p>
      <ol className="flex flex-wrap gap-3 sm:gap-4">
        {steps.map((step, i) => {
          const done = completed >= step.id
          const current = s !== "completed" && nextStep === step.id

          let circleClass = "border-muted-foreground/40 text-muted-foreground bg-background"
          if (done) circleClass = "border-primary bg-primary text-primary-foreground"
          if (current) circleClass = "border-primary text-primary bg-primary/10 ring-2 ring-primary/30"
          if (!done && !current) circleClass = "border-muted-foreground/30 text-muted-foreground bg-muted/50"

          return (
            <li key={step.id} className="flex min-w-[7rem] max-w-[10rem] flex-1 flex-col items-center gap-1.5 text-center">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${circleClass}`}
              >
                {done ? <CheckCircle2 className="size-4" /> : i + 1}
              </span>
              <span className="text-[11px] leading-tight text-muted-foreground sm:text-xs">{step.label}</span>
              <span className="text-[10px] leading-tight text-muted-foreground/80 sm:text-[11px]">{step.subtitle}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const queryClient = useQueryClient()
  const [confirmOrder, setConfirmOrder] = useState(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [locationDraft, setLocationDraft] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ["account", "orders", id],
    queryFn: async () => {
      const { data: res } = await apiClient.get(`/account/orders/${id}`)
      return res?.data ?? res
    },
    enabled: Boolean(id),
  })

  const order = data

  useEffect(() => {
    if (!order) return
    const coords = normalizeLatLng(order.shipping_lat, order.shipping_lng)
    setLocationDraft({
      lat: coords.lat,
      lng: coords.lng,
      address: order.shipping_address ?? "",
    })
  }, [order?.id, order?.shipping_lat, order?.shipping_lng, order?.shipping_address])

  const updateMutation = useMutation({
    mutationFn: (payload) => apiClient.put(`/account/orders/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["account", "orders", id] })
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
      toast.success(t("orders.outForDeliverySuccess", "تم تأكيد خروج الطلب للتسليم."))
    },
    onError: (err) => {
      toast.error(orderMutationErrorMessage(err, t))
    },
  })

  const acceptCodMutation = useMutation({
    mutationFn: () => apiClient.put(`/account/orders/${id}`, { accept_cod: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["account", "orders", id] })
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
      toast.success(t("orders.codAccepted", "تم قبول الدفع عند الاستلام."))
    },
    onError: (err) => {
      toast.error(orderMutationErrorMessage(err, t))
    },
  })

  const confirmMutation = useMutation({
    mutationFn: () => apiClient.put(`/account/orders/${id}`, { confirm_receipt: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["account", "orders", id] })
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
      queryClient.invalidateQueries({ queryKey: ["account", "balance"] })
      setConfirmOrder(null)
      toast.success(t("orders.receiptConfirmed", "تم تأكيد الاستلام"))
    },
    onError: (err) => {
      toast.error(orderMutationErrorMessage(err, t))
    },
  })

  const confirmTransferMutation = useMutation({
    mutationFn: () => apiClient.put(`/account/orders/${id}`, { confirm_direct_transfer: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["account", "orders", id] })
      toast.success(t("orders.directTransferConfirmed", "تم تأكيد استلام التحويل."))
    },
    onError: (err) => {
      toast.error(orderMutationErrorMessage(err, t))
    },
  })

  const locationMutation = useMutation({
    mutationFn: (payload) => apiClient.put(`/account/orders/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["account", "orders", id] })
      toast.success(t("orders.locationEditSaved", "تم تحديث موقع التسليم."))
    },
    onError: (err) => {
      toast.error(orderMutationErrorMessage(err, t))
    },
  })

  const markDeliveredMutation = useMutation({
    mutationFn: () => apiClient.put(`/account/orders/${id}`, { mark_delivered: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["account", "orders", id] })
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
      toast.success(t("orders.markedDelivered", "تم تعيين الطلب كمُسلَّم"))
    },
    onError: (err) => {
      toast.error(orderMutationErrorMessage(err, t))
    },
  })

  const handleDispatchOrder = () => {
    updateMutation.mutate({
      dispatch_out_for_delivery: true,
      dispatch_location_confirmed: true,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6" dir={direction}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="space-y-6" dir={direction}>
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/orders")} className="gap-1">
          <ChevronRight size={16} /> العودة للطلبات
        </Button>
        <p className="text-muted-foreground">لم يتم العثور على الطلب</p>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={direction}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/dashboard/orders")}
        className="gap-1"
      >
        <ChevronRight size={16} /> العودة للطلبات
      </Button>

      {order.status === "completed" && !order.is_buyer && order.product?.id ? (
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="text-primary" />
          <AlertTitle>{t("orders.sellerMarkSoldOutTitle", "تم إكمال الطلب")}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-pretty">
              {t(
                "orders.sellerMarkSoldOutBody",
                "إذا انتهى المخزون أو لا ترغب باستقبال طلبات جديدة على هذا الإعلان، يمكنك وضعه كـ «نفد / مباع» من إدارة الإعلانات.",
              )}
            </span>
            <Button asChild variant="outline" size="sm" className="shrink-0 self-start sm:self-center">
              <Link to="/dashboard/listings">{t("orders.sellerMarkSoldOutCta", "إدارة الإعلانات")}</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {order.payment_method === "direct_transfer"
        && !["cancelled", "disputed", "completed", "shipped", "delivered"].includes(order.status)
        && (() => {
          let message = null
          if (
            (order.status === "pending" || order.status === "awaiting_payment")
            && !order.seller_transfer_confirmed_at
          ) {
            message = order.is_buyer
              ? t(
                  "orders.directTransferAwaitingSellerBuyer",
                  "تم إرسال بيانات التحويل والسند. بانتظار تأكيد البائع لاستلام المبلغ.",
                )
              : t(
                  "orders.directTransferAwaitingSellerAction",
                  "راجع سند التحويل وأكّد استلام المبلغ قبل الشحن. يمكنك التواصل مع المشتري عند الحاجة.",
                )
          } else if (order.is_buyer && order.seller_transfer_confirmed_at && order.status === "pending") {
            message = t("orders.directTransferConfirmedBuyer", "أكّد البائع استلام التحويل. سيتم الشحن قريبًا.")
          }
          if (!message) return null
          return (
            <div
              className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-950 dark:text-sky-100"
              role="status"
            >
              {message}
            </div>
          )
        })()}

      {order.order_payment?.receipt_url ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Banknote className="size-4 text-primary" />
              {t("orders.directTransferReceiptTitle", "سند التحويل")}
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={resolveImageUrl(order.order_payment.receipt_url)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4 me-1" />
                {t("orders.directTransferReceiptView", "عرض السند")}
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {order.payment_method === "cod"
        && !order.cod_seller_accepted_at
        && (order.status === "cod_requested" || order.status === "pending") && (
        <div
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
          role="status"
        >
          {order.is_buyer
            ? t("orders.codAwaitingSellerBuyer", "ينتظر قبول البائع لهذا الطلب قبل الشحن.")
            : t("orders.codAwaitingSellerAction", "اقبل الطلب لتأكيد الدفع عند الاستلام ثم أكّد خروجه للتسليم.")}
        </div>
      )}

      <OrderStatusTimeline order={order} t={t} />

      {(order.shipping_lat != null && order.shipping_lng != null) ||
      order.shipping_address ||
      order.can_edit_location ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium">{t("orders.deliveryMapTitle", "موقع التسليم")}</p>
            {order.can_edit_location && order.location_edits_remaining != null ? (
              <p className="text-xs text-muted-foreground">
                {t("orders.locationEditHint", {
                  remaining: order.location_edits_remaining,
                  deadline: order.location_edit_deadline_at
                    ? new Date(order.location_edit_deadline_at).toLocaleString()
                    : "—",
                  defaultValue: `يمكنك تعديل الموقع ${order.location_edits_remaining} مرة قبل الموعد النهائي.`,
                })}
              </p>
            ) : null}
            {(locationDraft?.address || order.shipping_address) ? (
              <p className="text-sm text-muted-foreground">
                {locationDraft?.address || order.shipping_address}
              </p>
            ) : null}
            {order.can_edit_location && locationDraft ? (
              <>
                <StandardLocationMapField
                  lat={locationDraft.lat}
                  lng={locationDraft.lng}
                  address={locationDraft.address}
                  onChange={({ lat, lng }) => setLocationDraft((d) => ({ ...d, lat, lng }))}
                  onAddressResolved={(addr) => setLocationDraft((d) => ({ ...d, address: addr }))}
                />
                <Button
                  size="sm"
                  disabled={locationMutation.isPending || locationDraft.lat == null || locationDraft.lng == null}
                  onClick={() =>
                    locationMutation.mutate({
                      shipping_lat: locationDraft.lat,
                      shipping_lng: locationDraft.lng,
                      shipping_address: locationDraft.address || null,
                    })
                  }
                >
                  {locationMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  {t("orders.locationEditSave", "حفظ موقع التسليم")}
                </Button>
              </>
            ) : (
              (() => {
                const coords = normalizeLatLng(
                  locationDraft?.lat ?? order.shipping_lat,
                  locationDraft?.lng ?? order.shipping_lng,
                )
                if (coords.lat == null || coords.lng == null) return null
                return (
                  <LocationMapPreview
                    lat={coords.lat}
                    lng={coords.lng}
                    subtitle=""
                    label={order.shipping_address ?? t("orders.deliveryMapTitle", "موقع التسليم")}
                    dir={direction}
                    markerId={`order-${order.id}`}
                    showAttribution={false}
                    mapHeightClass="min-h-[220px] h-[260px] w-full sm:min-h-[280px] sm:h-[320px]"
                  />
                )
              })()
            )}
          </CardContent>
        </Card>
      ) : null}

      {order.payment_method === "cod"
        && order.status !== "completed"
        && order.status !== "cancelled"
        && order.status !== "disputed" && (
        <Card className="border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">
              {t("orders.codPayOnDeliveryTitle", "الدفع عند الاستلام")}
            </p>
            <p>{t("orders.codPayOnDeliveryBody", "ادفع المبلغ للبائع أو شركة الشحن عند استلام الطرد. بعد التأكد من المنتج، اضغط «تأكيد الاستلام» في التطبيق.")}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Link
              to={`/products/${order.product?.id}`}
              className="shrink-0 overflow-hidden rounded-lg bg-muted w-20 h-20 sm:w-24 sm:h-24"
            >
              {order.product?.image_url ? (
                <img
                  src={resolveImageUrl(order.product.image_url)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="size-8 text-muted-foreground" />
                </div>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">
                  {order.order_number}
                </span>
                <Badge className={statusColors[order.status] ?? "bg-muted"}>
                  {t(`dashboard.status.${order.status}`, order.status)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("ar-SA")}
                </span>
              </div>
              <Link
                to={`/products/${order.product?.id}`}
                className="mt-1 block font-semibold hover:underline line-clamp-2"
              >
                {order.product?.title}
              </Link>
              <p className="mt-1 text-lg font-bold text-primary">
                {order.amount?.toLocaleString("ar-SA")} ر.س
                {Number(order.quantity ?? 1) > 1 && (
                  <span className="ms-2 text-sm font-normal text-muted-foreground">
                    ({t("purchase.quantity", "الكمية")} × {order.quantity})
                  </span>
                )}
              </p>
              {order.buyer_note && (
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {t("purchase.buyerNote", "ملاحظات")}: {order.buyer_note}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {order.is_buyer
                  ? t("orders.youAreBuyer", "أنت المشتري")
                  : t("orders.youAreSeller", "أنت البائع")}
                {" • "}
                {t(
                  `dashboard.paymentMethodLabel.${order.payment_method === "balance" ? "escrow" : (order.payment_method ?? "escrow")}`,
                  order.payment_method ?? "",
                )}
              </p>
              {order.tracking_number && (
                <p className="mt-1 flex items-center gap-1 text-sm">
                  <Truck className="size-4" />
                  {order.carrier && `${order.carrier}: `}
                  {order.tracking_number}
                  {order.tracking_url && (
                    <a
                      href={order.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="inline size-3" />
                    </a>
                  )}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {order.can_confirm_receipt && (
                  <Button size="sm" onClick={() => setConfirmOrder(order)} className="gap-1">
                    <CheckCircle2 className="size-4" />
                    {order.is_buyer
                      ? (order.payment_method === "escrow" || order.payment_method === "balance")
                          ? t("orders.receiptReceivedProduct", "لقد استلمت المنتج")
                          : t("orders.confirmReceivedPrimary", "Confirm I received my order")
                      : t("orders.confirmReceipt", "تأكيد الاستلام")}
                  </Button>
                )}
                {order.can_mark_delivered && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    disabled={markDeliveredMutation.isPending}
                    onClick={() => markDeliveredMutation.mutate()}
                    title={t("orders.markDeliveredHint", "")}
                  >
                    {markDeliveredMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <PackageCheck className="size-4" />
                    )}
                    {t("orders.markDelivered", "تعيين كـ تم التسليم")}
                  </Button>
                )}
                {order.can_accept_cod && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    disabled={acceptCodMutation.isPending}
                    onClick={() => acceptCodMutation.mutate()}
                  >
                    {acceptCodMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Handshake className="size-4" />
                    )}
                    {t("orders.acceptCod", "قبول الدفع عند الاستلام")}
                  </Button>
                )}
                {order.can_confirm_direct_transfer && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    disabled={confirmTransferMutation.isPending}
                    onClick={() => confirmTransferMutation.mutate()}
                  >
                    {confirmTransferMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Banknote className="size-4" />
                    )}
                    {t("orders.confirmDirectTransfer", "تأكيد استلام التحويل")}
                  </Button>
                )}
                {order.can_contact_buyer && order.buyer?.phone ? (
                  <Button size="sm" variant="outline" className="gap-1" asChild>
                    <a href={`tel:${order.buyer.phone}`}>
                      <Phone className="size-4" />
                      {t("orders.contactBuyerPhone", "اتصال")}
                    </a>
                  </Button>
                ) : null}
                {order.can_review_seller && order.seller?.id ? (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setReviewOpen(true)}>
                    <Star className="size-4" />
                    {t("orders.rateSeller")}
                  </Button>
                ) : null}
                {order.can_dispatch_out_for_delivery && !order.is_buyer && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={handleDispatchOrder}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
                    {t("orders.outForDelivery", "خروج للتسليم")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {order.seller?.id ? (
        <LeaveReviewModal
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          targetUser={{
            id: order.seller.id,
            username: order.seller.username || order.seller.name,
            name: order.seller.name,
            avatar_url: order.seller.avatar_url,
          }}
          purchaseId={Number(id)}
          listingProductId={order.product?.id ?? null}
          existingReview={null}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["account", "orders", id] })
          }}
        />
      ) : null}

      <AlertDialog open={!!confirmOrder} onOpenChange={(o) => !o && setConfirmOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {(confirmOrder?.payment_method === "escrow" || confirmOrder?.payment_method === "balance")
                ? t("orders.confirmReceiptTitleProduct", "تأكيد أنك استلمت المنتج؟")
                : t("orders.confirmReceiptTitle", "تأكيد استلام المنتج؟")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmOrder?.payment_method === "cod"
                ? t("orders.confirmReceiptDescCod", "سيتم إكمال الطلب. تأكد أنك استلمت المنتج ودفعت عند الاستلام إن وُجدت مستحقات.")
                : t(
                    "orders.confirmReceiptDescFull",
                    "بعد التأكيد يُسجَّل الطلب مكتملًا ويُضاف مبلغ البيع إلى رصيد البائع القابل للسحب (للدفع عبر المنصة). تأكد أنك استلمت المنتج.",
                  )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (confirmOrder?.payment_method === "escrow" || confirmOrder?.payment_method === "balance") ? (
                t("orders.receiptReceivedProduct", "لقد استلمت المنتج")
              ) : (
                t("orders.confirm", "تأكيد")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
