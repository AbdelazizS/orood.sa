import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Package, Truck, CheckCircle2, Loader2, ExternalLink, PackageCheck, ChevronRight, Handshake } from "lucide-react"
import apiClient from "@/lib/apiClient"
import { resolveImageUrl } from "@/lib/imageUrl"
import { Link } from "react-router-dom"
import { toast } from "sonner"

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

function ordersListErrorMessage(error, t) {
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
  if (status === 401) return t("orders.listErrorAuth", "انتهت الجلسة أو غير مصرّح. سجّل الدخول مجددًا.")
  if (status === 403) return t("orders.listErrorForbidden", "لا يمكن عرض الطلبات.")
  if (error?.message && typeof error.message === "string") return error.message
  return t("orders.listLoadError", "تعذّر تحميل الطلبات. تحقق من الاتصال بالخادم.")
}

function OrderCard({
  order,
  onConfirm,
  onOrderRefresh,
  onMarkDelivered,
  markDeliveredPending,
}) {
  const { t } = useTranslation()

  const updateMutation = useMutation({
    mutationFn: (data) => apiClient.put(`/account/orders/${order.id}`, data),
    onSuccess: () => {
      onOrderRefresh?.()
      toast.success(t("orders.outForDeliverySuccess", "تم تأكيد خروج الطلب للتسليم."))
    },
    onError: (err) => {
      toast.error(orderMutationErrorMessage(err, t))
    },
  })

  const acceptCodMutation = useMutation({
    mutationFn: () => apiClient.put(`/account/orders/${order.id}`, { accept_cod: true }),
    onSuccess: () => {
      onOrderRefresh?.()
      toast.success(t("orders.codAccepted", "تم قبول الدفع عند الاستلام."))
    },
    onError: (err) => {
      toast.error(orderMutationErrorMessage(err, t))
    },
  })

  const handleDispatchOrder = () => {
    updateMutation.mutate({ dispatch_out_for_delivery: true, dispatch_location_confirmed: true })
  }

  return (
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
              <span className="font-mono text-sm text-muted-foreground">{order.order_number}</span>
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
            </p>
            <p className="text-sm text-muted-foreground">
              {order.is_buyer ? t("orders.youAreBuyer", "أنت المشتري") : t("orders.youAreSeller", "أنت البائع")}
              {" • "}
              {t(`dashboard.paymentMethodLabel.${order.payment_method ?? "escrow"}`, order.payment_method ?? "")}
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
              <Button variant="outline" size="sm" className="gap-1" asChild>
                <Link to={`/dashboard/orders/${order.id}`}>
                  <ChevronRight className="size-4 rtl:rotate-180" />
                  {t("orders.viewOrder", "عرض الطلب")}
                </Link>
              </Button>
              {order.can_confirm_receipt && (
                <Button size="sm" onClick={() => onConfirm(order)} className="gap-1">
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
                  disabled={markDeliveredPending}
                  onClick={() => onMarkDelivered?.(order)}
                  title={t("orders.markDeliveredHint", "")}
                >
                  {markDeliveredPending ? (
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
              {order.can_dispatch_out_for_delivery && !order.is_buyer && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={updateMutation.isPending}
                  onClick={handleDispatchOrder}
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
  )
}

export function OrderTrackingPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [role, setRole] = useState("all")
  const [page, setPage] = useState(1)
  const [confirmOrder, setConfirmOrder] = useState(null)

  useEffect(() => {
    setPage(1)
  }, [role])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["account", "orders", role, page],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/account/orders", { params: { role, page } })
      return res
    },
    staleTime: 0,
  })

  const confirmMutation = useMutation({
    mutationFn: (order) =>
      apiClient.put(`/account/orders/${order.id}`, { confirm_receipt: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["account", "balance"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
      setConfirmOrder(null)
      toast.success(t("orders.receiptConfirmed", "تم تأكيد الاستلام"))
    },
    onError: (err) => {
      toast.error(orderMutationErrorMessage(err, t))
    },
  })

  const markDeliveredMutation = useMutation({
    mutationFn: (orderId) =>
      apiClient.put(`/account/orders/${orderId}`, { mark_delivered: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
      toast.success(t("orders.markedDelivered", "تم تعيين الطلب كمُسلَّم"))
    },
    onError: (err) => {
      toast.error(orderMutationErrorMessage(err, t))
    },
  })

  const orders = data?.data ?? []
  const meta = data?.meta ?? {}
  const currentPage = Number(meta.current_page) || 1
  const lastPage = Number(meta.last_page) || 1
  const total = meta.total != null ? Number(meta.total) : 0

  const listBody = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      )
    }

    if (isError) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 px-4">
            <p className="text-center text-sm text-destructive max-w-md">
              {ordersListErrorMessage(error, t)}
            </p>
            <Button type="button" variant="secondary" onClick={() => refetch()}>
              {t("orders.retry", "إعادة المحاولة")}
            </Button>
          </CardContent>
        </Card>
      )
    }

    if (orders.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 px-4">
            <Package className="size-16 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground text-center">
              {t("orders.empty", "لا توجد طلبات بعد")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
              {t(
                "orders.emptyHint",
                "تظهر الطلبات عند شراء عرض بسعر من عضو آخر (لا يمكن شراء إعلانك أنت). للدفع عبر المنصة قد تحتاج شحن الرصيد أولًا.",
              )}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link to="/">{t("orders.browseOffers", "تصفح العروض")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/balance">{t("orders.emptyWalletCta", "المحفظة وشحن الرصيد")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <>
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onConfirm={setConfirmOrder}
              onOrderRefresh={() => queryClient.invalidateQueries({ queryKey: ["account", "orders"] })}
              onMarkDelivered={(o) => markDeliveredMutation.mutate(o.id)}
              markDeliveredPending={markDeliveredMutation.isPending}
            />
          ))}
        </div>
        {lastPage > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              {t("orders.pageOf", "صفحة {{current}} من {{last}} ({{total}})", {
                current: currentPage,
                last: lastPage,
                total,
              })}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("orders.prevPage", "السابق")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= lastPage}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("orders.nextPage", "التالي")}
              </Button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard.orderTracking", "تتبع الطلبات")}</h1>

      <Tabs
        value={role}
        onValueChange={(v) => {
          setRole(v)
        }}
      >
        <TabsList>
          <TabsTrigger value="all">{t("orders.all", "الكل")}</TabsTrigger>
          <TabsTrigger value="buyer">{t("orders.asBuyer", "كمشتري")}</TabsTrigger>
          <TabsTrigger value="seller">{t("orders.asSeller", "كبائع")}</TabsTrigger>
        </TabsList>
        <TabsContent value={role} className="mt-6">
          {listBody()}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!confirmOrder} onOpenChange={(o) => !o && setConfirmOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmOrder?.payment_method === "cod"
                ? t("orders.confirmReceiptTitle", "تأكيد استلام المنتج؟")
                : (confirmOrder?.payment_method === "escrow" || confirmOrder?.payment_method === "balance")
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
              onClick={() => confirmOrder && confirmMutation.mutate(confirmOrder)}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : confirmOrder?.payment_method === "cod" ? (
                t("orders.confirm", "تأكيد")
              ) : (
                t("orders.receiptReceivedProduct", "لقد استلمت المنتج")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
