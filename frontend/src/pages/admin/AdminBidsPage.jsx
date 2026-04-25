import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import apiClient from "@/lib/apiClient"
import { Search, Loader2, Gavel } from "lucide-react"
import { toast } from "sonner"

function bidColumns(t, onHide, onDelete) {
  return [
    {
      id: "id",
      header: "ID",
      cell: ({ row }) => <Link className="hover:underline" to={`/admin/bids/${row.original.id}`}>#{row.original.id}</Link>,
    },
    {
      id: "listing",
      header: t("admin.product", "Product"),
      cell: ({ row }) => row.original.product?.title ?? "—",
    },
    {
      id: "buyer",
      header: t("admin.buyer", "Buyer"),
      cell: ({ row }) => row.original.buyer?.name ?? row.original.user?.username ?? "—",
    },
    {
      id: "amount",
      header: t("admin.price", "Amount"),
      cell: ({ row }) => `${Math.round(Number(row.original.amount ?? 0)).toLocaleString()} ${t("common.currency")}`,
    },
    {
      id: "status",
      header: t("admin.status", "Status"),
      cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
    },
    {
      id: "actions",
      header: t("common.actions", "Actions"),
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onHide(row.original.id)}>
            {t("admin.hideBid", "Hide")}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete(row.original.id)}>
            {t("common.delete", "Delete")}
          </Button>
        </div>
      ),
    },
  ]
}

export function AdminBidsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [pendingAction, setPendingAction] = useState(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "bids", q, page],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/bids", { params: { q, page } })
      return data
    },
  })

  const hideMutation = useMutation({
    mutationFn: (id) => apiClient.patch(`/admin/bids/${id}/hide`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "bids"] })
      toast.success(t("admin.bidHidden", "Bid hidden"))
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? t("common.errorGeneric")),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/bids/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "bids"] })
      toast.success(t("admin.bidDeleted", "Bid deleted"))
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? t("common.errorGeneric")),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center p-10"><Loader2 className="size-8 animate-spin" /></div>
  }

  if (isError) {
    const unauthorized = error?.response?.status === 403 || error?.response?.status === 401
    return (
      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h1 className="text-xl font-semibold">{t("admin.bidsTitle", "Bids")}</h1>
        <p className="text-sm text-destructive">
          {unauthorized
            ? t("admin.bidsAccessDenied", "You do not have permission to view bids.")
            : error?.response?.data?.message ?? error?.message ?? t("common.errorGeneric")}
        </p>
      </div>
    )
  }

  const rows = Array.isArray(data?.data) ? data.data : []
  const meta = data?.meta ?? {}
  const currentPage = Number(meta?.current_page) > 0 ? Number(meta.current_page) : page
  const lastPage = Number(meta?.last_page) > 0 ? Number(meta.last_page) : 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.bidsTitle", "Bids")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin.bidsDescription", "Review and moderate all bids")}</p>
        </div>
        <div className="relative">
          <Search className="absolute start-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="w-56 ps-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.search")} />
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={bidColumns(
              t,
              (id) => setPendingAction({ type: "hide", id }),
              (id) => setPendingAction({ type: "delete", id })
            )}
            data={rows}
          />
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{t("common.page", "Page")} {currentPage} / {lastPage}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t("common.previous", "Previous")}
              </Button>
              <Button size="sm" variant="outline" disabled={currentPage >= lastPage} onClick={() => setPage((p) => p + 1)}>
                {t("common.next", "Next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
        <Gavel className="me-2 inline size-4" />
        {t("admin.bidsAuditHint", "Open a bid row for timeline/audit details.")}
      </div>

      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === "delete"
                ? t("admin.deleteConfirmTitle", "Delete bid?")
                : t("admin.hideBid", "Hide")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === "delete"
                ? t("admin.deleteConfirmDesc", "This action cannot be undone.")
                : t("admin.hideBidConfirmDesc", "The bid will be hidden from regular views.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <Button
              variant={pendingAction?.type === "delete" ? "destructive" : "outline"}
              onClick={() => {
                if (!pendingAction?.id) return
                if (pendingAction.type === "delete") {
                  deleteMutation.mutate(pendingAction.id, { onSettled: () => setPendingAction(null) })
                } else {
                  hideMutation.mutate(pendingAction.id, { onSettled: () => setPendingAction(null) })
                }
              }}
              disabled={deleteMutation.isPending || hideMutation.isPending}
            >
              {(deleteMutation.isPending || hideMutation.isPending) ? <Loader2 className="size-4 animate-spin" /> : null}
              {pendingAction?.type === "delete" ? t("common.delete", "Delete") : t("admin.hideBid", "Hide")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
