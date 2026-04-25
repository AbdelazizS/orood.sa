import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import apiClient from "@/lib/apiClient"
import { Search, ShoppingCart, Loader2, Package, CheckCircle, XCircle, Truck } from "lucide-react"
import { Link } from "react-router-dom"

const STATUS_MAP = {
  pending: { labelKey: "dashboard.status.pending", color: "secondary" },
  cod_requested: { labelKey: "dashboard.status.cod_requested", color: "secondary" },
  paid: { labelKey: "dashboard.status.paid", color: "secondary" },
  awaiting_payment: { labelKey: "dashboard.status.awaiting_payment", color: "secondary" },
  shipped: { labelKey: "dashboard.status.shipped", color: "default" },
  delivered: { labelKey: "dashboard.status.delivered", color: "default" },
  completed: { labelKey: "dashboard.status.completed", color: "default" },
  cancelled: { labelKey: "dashboard.status.cancelled", color: "destructive" },
  disputed: { labelKey: "dashboard.status.disputed", color: "destructive" },
}

const STATUS_FILTERS = [
  { value: "all", labelKey: "common.all" },
  { value: "new", labelKey: "admin.ordersNew" },
  { value: "completed", labelKey: "admin.ordersCompleted" },
  { value: "incomplete", labelKey: "admin.ordersIncomplete" },
  { value: "shipping", labelKey: "admin.ordersShipping" },
]

function orderColumns(t) {
  return [
    {
      id: "order_number",
      header: t("admin.orderNumber"),
      cell: ({ row }) => (
        <Link to={`/admin/orders/${row.original.id}`} className="font-medium hover:underline">
          {row.original.order_number}
        </Link>
      ),
    },
    {
      id: "product",
      header: t("admin.product"),
      cell: ({ row }) => {
        const p = row.original.product
        if (!p) return "—"
        return (
          <Link to={`/products/${p.id}`} className="flex items-center gap-2 hover:underline">
            {p.image_url && <img src={p.image_url} alt="" className="h-10 w-10 rounded object-cover" />}
            <span className="max-w-[180px] truncate">{p.title}</span>
          </Link>
        )
      },
    },
    {
      id: "buyer",
      header: t("admin.buyer"),
      cell: ({ row }) => {
        const b = row.original.buyer
        return b ? <span>{b.name}<br /><span className="text-xs text-muted-foreground">{b.email}</span></span> : "—"
      },
    },
    {
      id: "seller",
      header: t("admin.seller"),
      cell: ({ row }) => {
        const s = row.original.seller
        return s ? <span>{s.name}<br /><span className="text-xs text-muted-foreground">{s.email}</span></span> : "—"
      },
    },
    {
      id: "amount",
      header: t("admin.price"),
      cell: ({ row }) => `${row.original.amount} ${row.original.payment_method === "cod" ? "(COD)" : ""}`,
    },
    {
      id: "status",
      header: t("admin.status"),
      cell: ({ row }) => {
        const s = STATUS_MAP[row.original.status] ?? { labelKey: row.original.status, color: "secondary" }
        return <Badge variant={s.color}>{t(s.labelKey)}</Badge>
      },
    },
    {
      id: "created_at",
      header: t("admin.date"),
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
    },
  ]
}

export function AdminOrdersPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter)
      params.set("page", String(page))
      const { data: res } = await apiClient.get(`/admin/orders?${params}`)
      return res ?? {}
    },
  })

  const finalOrders = data?.data ?? []
  const finalMeta = data?.meta ?? {}
  const finalCounts = data?.counts ?? {}

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.ordersTitle")}</h1>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.ordersTitle")}</h1>
          <p className="text-muted-foreground text-sm">{t("admin.ordersDescription")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute start-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("admin.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-8 w-48"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {t(f.labelKey)} {finalCounts[f.value] != null ? `(${finalCounts[f.value]})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <Package className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">{t("admin.ordersNew")}</p>
              <p className="text-2xl font-semibold">{finalCounts.new ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-green-500/10 p-3">
              <CheckCircle className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">{t("admin.ordersCompleted")}</p>
              <p className="text-2xl font-semibold">{finalCounts.completed ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-destructive/10 p-3">
              <XCircle className="size-5 text-destructive" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">{t("admin.ordersIncomplete")}</p>
              <p className="text-2xl font-semibold">{finalCounts.incomplete ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <Truck className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">{t("admin.ordersShipping")}</p>
              <p className="text-2xl font-semibold">{finalCounts.shipping ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={orderColumns(t)}
            data={finalOrders}
            pagination
            manualPagination
            pageCount={finalMeta.last_page ?? 1}
            pageIndex={page - 1}
            onPageChange={(idx) => setPage(idx + 1)}
            total={finalMeta.total ?? 0}
          />
        </CardContent>
      </Card>
    </div>
  )
}
