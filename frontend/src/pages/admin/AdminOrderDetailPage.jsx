import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import apiClient from "@/lib/apiClient"
import { ArrowLeft, Loader2, Package, User, Truck, Edit } from "lucide-react"
import { Link } from "react-router-dom"
import { useState } from "react"

const STATUS_MAP = {
  pending: { labelKey: "orders.statusNew", color: "secondary" },
  paid: { labelKey: "orders.statusNew", color: "secondary" },
  shipped: { labelKey: "orders.statusShipping", color: "default" },
  delivered: { labelKey: "orders.statusShipping", color: "default" },
  completed: { labelKey: "orders.statusCompleted", color: "default" },
  cancelled: { labelKey: "orders.statusCancelled", color: "destructive" },
}

export function AdminOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ status: "", tracking_number: "", carrier: "", tracking_url: "" })

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

  const openEdit = () => {
    setEditForm({
      status: data?.status ?? "",
      tracking_number: data?.tracking_number ?? "",
      carrier: data?.carrier ?? "",
      tracking_url: data?.tracking_url ?? "",
    })
    setEditOpen(true)
  }

  const handleSaveEdit = () => {
    const payload = {}
    if (editForm.status) payload.status = editForm.status
    if (editForm.tracking_number !== undefined) payload.tracking_number = editForm.tracking_number || null
    if (editForm.carrier !== undefined) payload.carrier = editForm.carrier || null
    if (editForm.tracking_url !== undefined) payload.tracking_url = editForm.tracking_url || null
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
        <Button onClick={openEdit}>
          <Edit className="me-2 size-4" />
          {t("common.edit")}
        </Button>
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
                <Badge variant={statusInfo.color}>{t(statusInfo.labelKey)}</Badge>
              </div>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
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
            <div className="grid gap-2">
              <Label>{t("admin.trackingNumber", "Tracking number")}</Label>
              <Input
                value={editForm.tracking_number}
                onChange={(e) => setEditForm((f) => ({ ...f, tracking_number: e.target.value }))}
                placeholder="..."
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("admin.carrier", "Carrier")}</Label>
              <Input
                value={editForm.carrier}
                onChange={(e) => setEditForm((f) => ({ ...f, carrier: e.target.value }))}
                placeholder="..."
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("admin.trackingUrl", "Tracking URL")}</Label>
              <Input
                value={editForm.tracking_url}
                onChange={(e) => setEditForm((f) => ({ ...f, tracking_url: e.target.value }))}
                placeholder="https://..."
              />
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
