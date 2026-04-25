import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import apiClient from "@/lib/apiClient"
import { Loader2, ArrowDownToLine, Check, X } from "lucide-react"
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

export function AdminWithdrawalsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusId = (searchParams.get("focus") || "").trim()
  const queryClient = useQueryClient()
  const canApprove = usePermission("finance.approve_withdrawal")
  const [rejectId, setRejectId] = useState(null)
  const [rejectReason, setRejectReason] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "withdrawal-requests"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/admin/withdrawal-requests", { params: { status: "pending" } })
      return res?.data ?? []
    },
    enabled: canApprove,
  })

  useEffect(() => {
    if (!focusId || !data?.length) return
    const el = document.getElementById(`withdrawal-row-${focusId}`)
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [focusId, data])

  const approveMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/admin/withdrawal-requests/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "withdrawal-requests"] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      apiClient.post(`/admin/withdrawal-requests/${id}/reject`, { reason: reason || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "withdrawal-requests"] })
      setRejectId(null)
      setRejectReason("")
    },
  })

  if (!canApprove) {
    return (
      <div className="p-6 text-muted-foreground">
        {t("admin.noPermission", "You do not have permission to view this page.")}
      </div>
    )
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
        <ArrowDownToLine className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t("admin.withdrawals", "Withdrawal requests")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin.withdrawalsIntro", "Pending payout approvals")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.pendingWithdrawals", "Pending")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!data?.length ? (
            <p className="text-muted-foreground text-sm">{t("admin.noPendingWithdrawals", "No pending requests.")}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {data.map((row) => (
                <li
                  key={row.id}
                  id={`withdrawal-row-${row.id}`}
                  className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${String(row.id) === focusId ? "bg-primary/5 ring-2 ring-primary/40 ring-inset" : ""}`}
                >
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">
                      {row.user?.name ?? "—"}{" "}
                      <span className="text-muted-foreground">({row.user?.email})</span>
                    </div>
                    <div>
                      {t("common.amount")}: <Badge variant="secondary">{Number(row.amount).toFixed(2)} SAR</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      IBAN: {row.bank_iban} · {row.bank_name}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      onClick={() =>
                        navigate(
                          `/admin/messages?user_email=${encodeURIComponent(row.user?.email ?? "")}&source=withdrawal_request&withdrawal_id=${row.id}`,
                        )
                      }
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
            <DialogTitle>{t("admin.rejectWithdrawal", "Reject withdrawal")}</DialogTitle>
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
