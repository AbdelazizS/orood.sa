import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Package, Truck, CheckCircle2, Loader2, ExternalLink, MapPin } from "lucide-react"
import apiClient from "@/lib/apiClient"
import { resolveImageUrl } from "@/lib/imageUrl"
import { Link } from "react-router-dom"
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

function OrderCard({ order, onConfirm, onTrackingUpdate }) {
  const { t } = useTranslation()
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? "")
  const [carrier, setCarrier] = useState(order.carrier ?? "")
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "")

  const updateMutation = useMutation({
    mutationFn: (data) => apiClient.put(`/account/orders/${order.id}`, data),
    onSuccess: () => {
      onTrackingUpdate?.()
      setTrackingOpen(false)
      toast.success(t("orders.trackingUpdated", "تم تحديث التتبع"))
    },
  })

  const handleSaveTracking = () => {
    updateMutation.mutate({ tracking_number: trackingNumber, carrier, tracking_url: trackingUrl || undefined })
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
              {order.is_buyer ? t("orders.youAreBuyer", "أنت المشتري") : t("orders.youAreSeller", "أنت البائع")}
              {" • "}
              {order.payment_method === "escrow" ? t("orders.escrow", "ضمان") : t("orders.cod", "الدفع عند الاستلام")}
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
                  onClick={() => onConfirm(order)}
                  className="gap-1"
                >
                  <CheckCircle2 className="size-4" />
                  {t("orders.confirmReceipt", "تأكيد الاستلام")}
                </Button>
              )}
              {order.can_add_tracking && (
                <Sheet open={trackingOpen} onOpenChange={setTrackingOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Truck className="size-4" />
                      {order.tracking_number ? t("orders.updateTracking", "تحديث التتبع") : t("orders.addTracking", "إضافة التتبع")}
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>{t("orders.shipmentTracking", "تتبع الشحن")}</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      <div>
                        <label className="text-sm font-medium">{t("orders.carrier", "شركة الشحن")}</label>
                        <Input
                          value={carrier}
                          onChange={(e) => setCarrier(e.target.value)}
                          placeholder="أرامكس، DHL، ..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">{t("orders.trackingNumber", "رقم التتبع")}</label>
                        <Input
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="1234567890"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">{t("orders.trackingUrl", "رابط التتبع")}</label>
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
                        {updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.save")}
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
  )
}

export function OrderTrackingPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [role, setRole] = useState("all")
  const [confirmOrder, setConfirmOrder] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ["account", "orders", role],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/account/orders", { params: { role } })
      return res
    },
  })

  const confirmMutation = useMutation({
    mutationFn: (order) =>
      apiClient.put(`/account/orders/${order.id}`, { confirm_receipt: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["account", "balance"] })
      setConfirmOrder(null)
      toast.success(t("orders.receiptConfirmed", "تم تأكيد الاستلام"))
    },
  })

  const orders = data?.data ?? []
  const meta = data?.meta ?? {}

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard.orderTracking", "تتبع الطلبات")}</h1>

      <Tabs value={role} onValueChange={setRole}>
        <TabsList>
          <TabsTrigger value="all">{t("orders.all", "الكل")}</TabsTrigger>
          <TabsTrigger value="buyer">{t("orders.asBuyer", "كمشتري")}</TabsTrigger>
          <TabsTrigger value="seller">{t("orders.asSeller", "كبائع")}</TabsTrigger>
        </TabsList>
        <TabsContent value={role} className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="size-16 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  {t("orders.empty", "لا توجد طلبات بعد")}
                </p>
                <Button asChild className="mt-4">
                  <Link to="/">{t("orders.browseOffers", "تصفح العروض")}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onConfirm={setConfirmOrder}
                  onTrackingUpdate={() => queryClient.invalidateQueries({ queryKey: ["account", "orders"] })}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
              onClick={() => confirmOrder && confirmMutation.mutate(confirmOrder)}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("orders.confirm", "تأكيد")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
