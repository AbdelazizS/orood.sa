import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import { ArrowLeft, Loader2, Package, User, Truck, Edit } from "lucide-react"
import { Link } from "react-router-dom"
import { useState } from "react"
import { toast } from "sonner"
import { usePermission } from "@/hooks/usePermission"

const STATUS_MAP = {
  pending: { labelKey: "orders.statusNew", color: "secondary" },
  cod_requested: { labelKey: "orders.statusNew", color: "secondary" },
  paid: { labelKey: "orders.statusNew", color: "secondary" },
  awaiting_payment: { labelKey: "orders.statusNew", color: "secondary" },
  shipped: { labelKey: "orders.statusShipping", color: "default" },
  delivered: { labelKey: "orders.statusShipping", color: "default" },
  completed: { labelKey: "orders.statusCompleted", color: "default" },
  cancelled: { labelKey: "orders.statusCancelled", color: "destructive" },
  disputed: { labelKey: "orders.statusDisputed", color: "destructive" },
}

export function AdminOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canUpdateOrder = usePermission("orders.update_status")
  const canDisputeResolve = usePermission("orders.dispute_resolve")
  const canRefund = usePermission("orders.refund")
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ status: "" })
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [forceCompleteOpen, setForceCompleteOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundReason, setRefundReason] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "order", id],
    queryFn: async () => {
      const { data: res } = await apiClient.get(`/admin/orders/${id}`)
      return res?.data ?? null
    },
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      const { data: res } = await apiClient.put(`/admin/orders/${id}`, payload)
      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "order", id] })
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] })
      setEditOpen(false)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (reason) => {
      const { data: res } = await apiClient.post(`/admin/orders/${id}/cancel`, { reason })
      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "order", id] })
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] })
      setCancelOpen(false)
      setCancelReason("")
      toast.success(t("admin.orderCancelled", "Order cancelled"))
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message ??
        (typeof err?.response?.data?.errors === "object"
          ? Object.values(err.response.data.errors).flat()[0]
          : null) ??
        t("common.error")
      toast.error(msg)
    },
  })

  const forceCompleteMutation = useMutation({
    mutationFn: async () => {
      const { data: res } = await apiClient.post(`/admin/orders/${id}/force-complete`)
      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "order", id] })
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] })
      setForceCompleteOpen(false)
      toast.success(t("admin.orderForceCompleted", "Order completed"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const forceRefundMutation = useMutation({
    mutationFn: async (reason) => {
      const { data: res } = await apiClient.post(`/admin/orders/${id}/force-refund`, { reason })
      return res?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "order", id] })
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] })
      setRefundOpen(false)
      setRefundReason("")
      toast.success(t("admin.orderRefunded", "Order refunded and cancelled"))
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message ??
        (typeof err?.response?.data?.errors === "object"
          ? Object.values(err.response.data.errors).flat()[0]
          : null) ??
        t("common.error")
      toast.error(msg)
    },
  })

  const openEdit = () => {
    setEditForm({
      status: data?.status ?? "",
    })
    setEditOpen(true)
  }

  const handleSaveEdit = () => {
    const payload = {}
    if (editForm.status) payload.status = editForm.status
    if (Object.keys(payload).length) updateMutation.mutate(payload)
    else setEditOpen(false)
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const statusInfo = STATUS_MAP[data.status] ?? { labelKey: data.status, color: "secondary" }
  const terminal = data.status === "completed" || data.status === "cancelled"
  const showAdminCancel = canUpdateOrder && !terminal
  const showForceComplete = canDisputeResolve && data.status === "disputed"
  const showForceRefund = canRefund && !terminal

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/orders")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{data.order_number}</h1>
          <p className="text-muted-foreground text-sm">{t("admin.orderDetails", "Order details")}</p>
        </div>
        {canUpdateOrder && (
          <Button onClick={openEdit}>
            <Edit className="me-2 size-4" />
            {t("common.edit")}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-5" />
              {t("admin.product")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.product ? (
              <div className="flex gap-4">
                {data.product.image_url && (
                  <img src={data.product.image_url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                )}
                <div>
                  <Link to={`/products/${data.product.id}`} className="font-medium hover:underline">
                    {data.product.title}
                  </Link>
                  <p className="text-muted-foreground text-sm">{data.product.price} {t("common.currency")}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("admin.status")}</span>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {data.from_bid ? (
                    <Badge variant="outline" className="font-normal">
                      {t("admin.orderFromBid", "Bid-originated order")}
                    </Badge>
                  ) : null}
                  <Badge variant={statusInfo.color}>{t(statusInfo.labelKey)}</Badge>
                </div>
              </div>
              {data.bid_id ? (
                <p className="text-muted-foreground text-xs">
                  {t("admin.orderBidId", "Bid #{{id}}", { id: data.bid_id })}
                </p>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("admin.price")}</span>
                <span>{data.amount} {t("common.currency")} {data.payment_method === "cod" ? "(COD)" : ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("admin.date", "Date")}</span>
                <span>{new Date(data.created_at).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5" />
              {t("admin.buyer", "Buyer")} / {t("admin.seller")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-muted-foreground text-sm">{t("admin.buyer", "Buyer")}</p>
              {data.buyer ? (
                <p className="font-medium">{data.buyer.name}<br />
                  <span className="text-muted-foreground text-sm">{data.buyer.email}</span>
                  {data.buyer.phone && <><br /><span className="text-muted-foreground text-sm">{data.buyer.phone}</span></>}
                </p>
              ) : (
                <p>—</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-sm">{t("admin.seller")}</p>
              {data.seller ? (
                <p className="font-medium">{data.seller.name}<br />
                  <span className="text-muted-foreground text-sm">{data.seller.email}</span>
                  {data.seller.phone && <><br /><span className="text-muted-foreground text-sm">{data.seller.phone}</span></>}
                </p>
              ) : (
                <p>—</p>
              )}
            </div>
          </CardContent>
        </Card>

        {(data.tracking_number || data.carrier || data.tracking_url || data.shipping_address) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="size-5" />
                {t("admin.shipping", "Shipping")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.shipping_address && (
                <div>
                  <span className="text-muted-foreground">{t("admin.shippingAddress", "Address")}: </span>
                  {data.shipping_address}
                </div>
              )}
              {data.tracking_number && (
                <div>
                  <span className="text-muted-foreground">{t("admin.trackingNumber", "Tracking")}: </span>
                  {data.tracking_number}
                </div>
              )}
              {data.carrier && (
                <div>
                  <span className="text-muted-foreground">{t("admin.carrier", "Carrier")}: </span>
                  {data.carrier}
                </div>
              )}
              {data.tracking_url && (
                <div>
                  <a href={data.tracking_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {t("admin.trackShipment", "Track shipment")}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {(data.admin_cancellation_reason || data.admin_refund_reason) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.orderResolution", "Resolution")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.admin_cancellation_reason && (
              <p>
                <span className="text-muted-foreground">{t("admin.orderCancelReason", "Cancellation reason")}: </span>
                {data.admin_cancellation_reason}
              </p>
            )}
            {data.admin_refund_reason && (
              <p>
                <span className="text-muted-foreground">{t("admin.orderRefundReason", "Refund reason")}: </span>
                {data.admin_refund_reason}
              </p>
            )}
            {data.admin_cancelled_at && (
              <p className="text-muted-foreground text-xs">
                {new Date(data.admin_cancelled_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {(showAdminCancel || showForceComplete || showForceRefund) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.orderDangerZone", "Admin actions")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {showAdminCancel && (
              <Button variant="outline" onClick={() => setCancelOpen(true)}>
                {t("admin.orderCancelAction", "Cancel order")}
              </Button>
            )}
            {showForceComplete && (
              <Button onClick={() => setForceCompleteOpen(true)}>
                {t("admin.orderForceCompleteAction", "Force complete (release payment)")}
              </Button>
            )}
            {showForceRefund && (
              <Button variant="destructive" onClick={() => setRefundOpen(true)}>
                {t("admin.orderForceRefundAction", "Force refund to buyer")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.orderCancelTitle", "Cancel this order?")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.orderCancelHint", "Provide a reason. Escrow will return to the buyer when applicable.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder={t("admin.reason", "Reason")}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={!cancelReason.trim() || cancelMutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                cancelMutation.mutate(cancelReason.trim())
              }}
            >
              {cancelMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("admin.orderCancelSubmit", "Cancel order")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={forceCompleteOpen} onOpenChange={setForceCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.orderForceCompleteTitle", "Complete order after dispute?")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.orderForceCompleteDesc", "Marks completed and releases escrow to the seller when applicable.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={forceCompleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                forceCompleteMutation.mutate()
              }}
            >
              {forceCompleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("admin.orderForceCompleteSubmit", "Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={refundOpen} onOpenChange={setRefundOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.orderForceRefundTitle", "Refund buyer and cancel?")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.orderForceRefundDesc", "Cancels the order and returns held escrow to the buyer when applicable.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder={t("admin.reason", "Reason")}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={!refundReason.trim() || forceRefundMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                forceRefundMutation.mutate(refundReason.trim())
              }}
            >
              {forceRefundMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("admin.orderForceRefundSubmit", "Force refund")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editOpen && canUpdateOrder} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.editOrder", "Edit order")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("admin.status")}</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(STATUS_MAP).map((s) => (
                    <SelectItem key={s} value={s}>{t(STATUS_MAP[s].labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="me-2 size-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
