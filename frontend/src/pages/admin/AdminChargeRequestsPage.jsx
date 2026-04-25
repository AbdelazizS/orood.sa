import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import apiClient from "@/lib/apiClient"
import { Loader2, Wallet, Check, X } from "lucide-react"
import { usePermission } from "@/hooks/usePermission"
import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export function AdminChargeRequestsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusId = (searchParams.get("focus") || "").trim()
  const queryClient = useQueryClient()
  const canApprove = usePermission("finance.approve_charge")
  const [rejectId, setRejectId] = useState(null)
  const [rejectReason, setRejectReason] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "charge-requests"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/admin/charge-requests", { params: { status: "pending" } })
      return res?.data ?? []
    },
    enabled: canApprove,
  })

  useEffect(() => {
    if (!focusId || !data?.length) return
    const el = document.getElementById(`charge-row-${focusId}`)
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [focusId, data])

  const approveMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/admin/charge-requests/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "charge-requests"] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      apiClient.post(`/admin/charge-requests/${id}/reject`, { reason: reason || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "charge-requests"] })
      setRejectId(null)
      setRejectReason("")
    },
  })

  if (!canApprove) {
    return <div className="p-6 text-muted-foreground">{t("admin.noPermission", "You do not have permission to view this page.")}</div>
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t("admin.chargeRequests", "Charge requests")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin.chargeRequestsIntro", "Pending wallet top-up approvals")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.pendingCharges", "Pending")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!data?.length ? (
            <p className="text-muted-foreground text-sm">{t("admin.noPendingCharges", "No pending requests.")}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {data.map((row) => (
                <li
                  key={row.id}
                  id={`charge-row-${row.id}`}
                  className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${String(row.id) === focusId ? "bg-primary/5 ring-2 ring-primary/40 ring-inset" : ""}`}
                >
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">
                      {row.user?.name ?? "—"} <span className="text-muted-foreground">({row.user?.email})</span>
                    </div>
                    <div>
                      {t("common.amount")}: <Badge variant="secondary">{Number(row.amount).toFixed(2)} SAR</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("purchase.paymentMethod", "Payment method")}: {row.payment_method || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("dashboard.payerBankName", "Your bank name")}: {row.payer_bank_name || "—"} ·{" "}
                      {t("dashboard.transferReference", "Transfer reference")}: {row.transfer_reference || "—"}
                    </div>
                    {row.receipt_url && (
                      <a
                        href={row.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {t("dashboard.viewReceipt", "View receipt")}
                      </a>
                    )}
                    {row.note && (
                      <div className="text-xs text-muted-foreground">
                        {t("dashboard.chargeNote", "Note")}: {row.note}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/admin/messages?user_email=${encodeURIComponent(row.user?.email ?? "")}&source=charge_request&charge_id=${row.id}`)}
                    >
                      {t("admin.contactClient", "Contact client")}
                    </Button>
                    <Button
                      size="sm"
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      onClick={() => approveMutation.mutate(row.id)}
                    >
                      <Check className="me-1 size-4" />
                      {t("common.approve", "Approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      onClick={() => setRejectId(row.id)}
                    >
                      <X className="me-1 size-4" />
                      {t("common.reject", "Reject")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectId != null} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.rejectCharge", "Reject charge request")}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={t("admin.rejectionReason", "Reason (optional)")}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={() => rejectId && rejectMutation.mutate({ id: rejectId, reason: rejectReason })}
            >
              {t("common.reject", "Reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
