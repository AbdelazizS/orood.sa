import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
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
import { Package, Truck, CheckCircle2, Loader2, ExternalLink, ChevronRight } from "lucide-react"
import { toast } from "sonner"

const statusLabels = {
  pending: "قيد الانتظار",
  paid: "مدفوع",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  completed: "مكتمل",
  cancelled: "ملغي",
}

const statusColors = {
  pending: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  paid: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  shipped: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400",
  delivered: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  completed: "bg-green-500/20 text-green-700 dark:text-green-400",
  cancelled: "bg-muted text-muted-foreground",
}

export function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const queryClient = useQueryClient()
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [confirmOrder, setConfirmOrder] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ["account", "orders", id],
    queryFn: async () => {
      const { data: res } = await apiClient.get(`/account/orders/${id}`)
      return res?.data ?? res
    },
    enabled: Boolean(id),
  })

  const [trackingNumber, setTrackingNumber] = useState("")
  const [carrier, setCarrier] = useState("")
  const [trackingUrl, setTrackingUrl] = useState("")

  const order = data

  const updateMutation = useMutation({
    mutationFn: (payload) => apiClient.put(`/account/orders/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
      setTrackingOpen(false)
      toast.success(t("orders.trackingUpdated", "تم تحديث التتبع"))
    },
  })

  const confirmMutation = useMutation({
    mutationFn: () => apiClient.put(`/account/orders/${id}`, { confirm_receipt: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] })
      setConfirmOrder(null)
      toast.success(t("orders.receiptConfirmed", "تم تأكيد الاستلام"))
    },
  })

  const handleSaveTracking = () => {
    updateMutation.mutate({
      tracking_number: trackingNumber,
      carrier: carrier || undefined,
      tracking_url: trackingUrl || undefined,
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
                  {statusLabels[order.status] ?? order.status}
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
                {order.is_buyer
                  ? t("orders.youAreBuyer", "أنت المشتري")
                  : t("orders.youAreSeller", "أنت البائع")}
                {" • "}
                {order.payment_method === "escrow"
                  ? t("orders.escrow", "ضمان")
                  : t("orders.cod", "الدفع عند الاستلام")}
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
                  <Button
                    size="sm"
                    onClick={() => setConfirmOrder(order)}
                    className="gap-1"
                  >
                    <CheckCircle2 className="size-4" />
                    {t("orders.confirmReceipt", "تأكيد الاستلام")}
                  </Button>
                )}
                {order.can_add_tracking && (
                  <Sheet open={trackingOpen} onOpenChange={setTrackingOpen}>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => {
                          setTrackingNumber(order.tracking_number ?? "")
                          setCarrier(order.carrier ?? "")
                          setTrackingUrl(order.tracking_url ?? "")
                        }}
                      >
                        <Truck className="size-4" />
                        {order.tracking_number
                          ? t("orders.updateTracking", "تحديث التتبع")
                          : t("orders.addTracking", "إضافة التتبع")}
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>{t("orders.shipmentTracking", "تتبع الشحن")}</SheetTitle>
                      </SheetHeader>
                      <div className="mt-6 space-y-4">
                        <div>
                          <label className="text-sm font-medium">
                            {t("orders.carrier", "شركة الشحن")}
                          </label>
                          <Input
                            value={carrier}
                            onChange={(e) => setCarrier(e.target.value)}
                            placeholder="أرامكس، DHL، ..."
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            {t("orders.trackingNumber", "رقم التتبع")}
                          </label>
                          <Input
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            placeholder="1234567890"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            {t("orders.trackingUrl", "رابط التتبع")}
                          </label>
                          <Input
                            value={trackingUrl}
                            onChange={(e) => setTrackingUrl(e.target.value)}
                            placeholder="https://..."
                            type="url"
                            className="mt-1"
                          />
                        </div>
                        <Button
                          onClick={handleSaveTracking}
                          disabled={updateMutation.isPending || !trackingNumber}
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            t("common.save")
                          )}
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmOrder} onOpenChange={(o) => !o && setConfirmOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("orders.confirmReceiptTitle", "تأكيد استلام المنتج؟")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("orders.confirmReceiptDesc", "سيتم تحرير المبلغ للبائع. تأكد أنك استلمت المنتج.")}
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
