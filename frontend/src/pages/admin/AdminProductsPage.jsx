import { useState, useMemo, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import apiClient from "@/lib/apiClient"
import { useTranslation } from "react-i18next"
import { MoreHorizontal, Pencil, Trash2, Search, Loader2, Check, X } from "lucide-react"
import { Link } from "react-router-dom"

function productColumns({ t, setEditing, setDeleteConfirm, onApprove, onReject, isApprovePending, isRejectPending }) {
  return [
    {
      id: "image",
      header: t("admin.image", "Image"),
      cell: ({ row }) => {
        const p = row.original
        return p.media?.image_url || p.media?.cover || p.image_url ? (
          <img src={p.media?.image_url || p.media?.cover || p.image_url} alt="" className="h-12 w-12 rounded object-cover" />
        ) : (
          <div className="h-12 w-12 rounded bg-muted" />
        )
      },
    },
    {
      id: "title",
      header: t("addOffer.titleLabel"),
      cell: ({ row }) => (
        <Link to={`/products/${row.original.id}`} className="font-medium hover:underline">
          {row.original.title}
        </Link>
      ),
    },
    {
      id: "type",
      header: t("admin.type", "Type"),
      cell: ({ row }) => (
        <Badge variant={row.original.type === "offer" ? "default" : "secondary"}>
          {row.original.type}
        </Badge>
      ),
    },
    {
      id: "price",
      header: t("admin.price"),
      cell: ({ row }) => row.original.price != null ? `${row.original.price}` : "—",
    },
    {
      id: "status",
      header: t("admin.status"),
      cell: ({ row }) => (
        <Badge variant={row.original.status === "published" ? "default" : "outline"}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "moderation",
      header: t("admin.moderation", "Moderation"),
      cell: ({ row }) => {
        const p = row.original
        return (
          <div className="flex items-center gap-1">
            <Badge variant={p.moderation_status === "approved" ? "default" : p.moderation_status === "rejected" ? "destructive" : "secondary"}>
              {p.moderation_status ?? "approved"}
            </Badge>
            {p.moderation_status === "pending" && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => onApprove(p.id)} disabled={isApprovePending}>
                  <Check className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onReject(p.id)} disabled={isRejectPending}>
                  <X className="size-4" />
                </Button>
              </>
            )}
          </div>
        )
      },
    },
    {
      id: "stats",
      header: t("productDetails.statsViews", "Views") + " / " + t("productDetails.statsPurchases", "Purchases"),
      cell: ({ row }) => {
        const s = row.original.stats ?? {}
        return `${s.views ?? 0} / ${s.purchases ?? 0}`
      },
    },
    {
      id: "seller",
      header: t("admin.seller", "Seller"),
      cell: ({ row }) => row.original.seller?.name ?? "—",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const p = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(p)}>
                <Pencil className="me-2 size-4" />
                {t("admin.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteConfirm(p)} className="text-destructive">
                <Trash2 className="me-2 size-4" />
                {t("categories.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

function EditProductDialog({ product, onClose, onSave, isPending }) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(product.title ?? "")
  const [description, setDescription] = useState(product.description ?? "")
  const [price, setPrice] = useState(product.price != null ? String(product.price) : "")
  const [type, setType] = useState(product.type ?? "offer")
  const [status, setStatus] = useState(product.status || "published")
  const [wholesalePrice, setWholesalePrice] = useState(product.wholesale_price != null ? String(product.wholesale_price) : "")
  const [minQuantity, setMinQuantity] = useState(product.min_quantity != null ? String(product.min_quantity) : "")
  const [isWholesale, setIsWholesale] = useState(product.is_wholesale ?? false)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("admin.editListing")}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSave({
              title,
              description: description || null,
              price: price ? Number(price) : null,
              type,
              status,
              wholesale_price: wholesalePrice ? Number(wholesalePrice) : null,
              min_quantity: minQuantity ? Number(minQuantity) : null,
              is_wholesale: isWholesale,
            })
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="edit-title">{t("addOffer.titleLabel")}</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">{t("addOffer.descriptionLabel")}</Label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type">{t("admin.type")}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offer">{t("feed.offer")}</SelectItem>
                  <SelectItem value="request">{t("feed.request")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">{t("admin.price")}</Label>
              <Input id="edit-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t("feed.priceOnRequest")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-status">{t("admin.status")}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t("admin.statusDraft")}</SelectItem>
                  <SelectItem value="published">{t("admin.statusPublished")}</SelectItem>
                  <SelectItem value="archived">{t("admin.statusArchived")}</SelectItem>
                  <SelectItem value="suspended">{t("admin.statusSuspended")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Label className="flex items-center gap-2 font-medium cursor-pointer">
                <input type="checkbox" checked={isWholesale} onChange={(e) => setIsWholesale(e.target.checked)} className="rounded" />
                {t("filters.wholesale")}
              </Label>
            </div>
          </div>
          {isWholesale && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-wholesale-price">{t("wholesale.price")}</Label>
                <Input id="edit-wholesale-price" type="number" min="0" step="0.01" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-min-quantity">{t("wholesale.minQuantity")}</Label>
                <Input id="edit-min-quantity" type="number" min="1" value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AdminProductsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [regionFilter, setRegionFilter] = useState("")
  const [moderationFilter, setModerationFilter] = useState("")
  const [editing, setEditing] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/categories")
      return data?.data ?? []
    },
  })

  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data } = await apiClient.get("/regions")
      return data?.data ?? []
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products", search, typeFilter, statusFilter, categoryFilter, regionFilter, moderationFilter, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (typeFilter) params.set("type", typeFilter)
      if (statusFilter) params.set("status", statusFilter)
      if (categoryFilter) params.set("category_id", categoryFilter)
      if (regionFilter) params.set("region_id", regionFilter)
      if (moderationFilter) params.set("moderation_status", moderationFilter)
      params.set("page", String(page))
      params.set("per_page", String(pageSize))
      const { data: res } = await apiClient.get(`/admin/products?${params}`)
      return res
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.put(`/admin/products/${id}`, payload),
    onSuccess: async () => {
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] })
      toast.success(t("admin.updateSuccess", "Listing updated successfully"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("admin.updateError", "Failed to update listing"))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/products/${id}`),
    onSuccess: async () => {
      setDeleteConfirm(null)
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] })
      toast.success(t("admin.deleteSuccess", "Listing deleted successfully"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("admin.deleteError", "Failed to delete listing"))
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/admin/products/${id}/approve`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] })
      toast.success(t("admin.approveSuccess", "Listing approved"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("admin.approveError", "Failed to approve"))
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/admin/products/${id}/reject`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] })
      toast.success(t("admin.rejectSuccess", "Listing rejected"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("admin.rejectError", "Failed to reject"))
    },
  })

  const products = data?.data ?? []
  const meta = data?.meta ?? {}
  const total = meta.total ?? 0

  const handleApprove = useCallback((id) => approveMutation.mutate(id), [approveMutation])
  const handleReject = useCallback((id) => rejectMutation.mutate(id), [rejectMutation])

  const columns = useMemo(
    () =>
      productColumns({
        t,
        setEditing,
        setDeleteConfirm,
        onApprove: handleApprove,
        onReject: handleReject,
        isApprovePending: approveMutation.isPending,
        isRejectPending: rejectMutation.isPending,
      }),
    [t, setEditing, setDeleteConfirm, handleApprove, handleReject, approveMutation.isPending, rejectMutation.isPending]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.offersAndRequests")}</h1>
          <p className="text-sm text-muted-foreground">{total} {t("admin.itemsTotal", "items")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute start-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t("admin.search", "Search...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-8 w-48"
            />
          </div>
          <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t("admin.type", "Type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="offer">{t("feed.offer")}</SelectItem>
              <SelectItem value="request">{t("feed.request")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t("admin.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="published">{t("admin.statusPublished")}</SelectItem>
              <SelectItem value="draft">{t("admin.statusDraft")}</SelectItem>
              <SelectItem value="archived">{t("admin.statusArchived")}</SelectItem>
              <SelectItem value="suspended">{t("admin.statusSuspended")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("addOffer.categoryLabel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name_ar || c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={regionFilter || "all"} onValueChange={(v) => setRegionFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t("addOffer.regionLabel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={moderationFilter || "all"} onValueChange={(v) => setModerationFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t("admin.moderation")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="approved">{t("admin.approve")}</SelectItem>
              <SelectItem value="pending">{t("admin.pendingModeration", "Pending")}</SelectItem>
              <SelectItem value="rejected">{t("admin.reject")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={products}
              pagination
              manualPagination
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              pageCount={meta.last_page ?? 1}
              pageIndex={page - 1}
              onPageChange={(idx) => setPage(idx + 1)}
              total={total}
            />
          )}
        </CardContent>
      </Card>

      {editing && (
        <EditProductDialog
          product={editing}
          onClose={() => setEditing(null)}
          onSave={(payload) => {
            updateMutation.mutate({ id: editing.id, payload })
          }}
          isPending={updateMutation.isPending}
        />
      )}

      {deleteConfirm && (
        <AlertDialog open onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("admin.deleteListing", "Delete Listing")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("admin.deleteConfirm", "Are you sure you want to delete")} &quot;{deleteConfirm.title}&quot;? {t("admin.deleteIrreversible", "This action cannot be undone.")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("categories.delete")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
