import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import apiClient from "@/lib/apiClient"
import { resolveAssetUrl, looksLikeAssetUrl } from "@/lib/imageUrl"
import {
  TransferReceiptDocument,
  extractReceiptHref,
  isReceiptValueField,
} from "@/components/finance/TransferReceiptDocument"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { usePermission } from "@/hooks/usePermission"
import { isFileFieldType } from "@/lib/finance/iban"

function opFieldValue(op, key) {
  const row = op?.values?.find((v) => v.field_key === key)
  if (!row) return ""
  if (row.value_text) return row.value_text
  if (row.file_url) return row.file_url
  if (row.value_json != null) {
    return typeof row.value_json === "string" ? row.value_json : JSON.stringify(row.value_json)
  }
  return ""
}

function frFieldValue(row) {
  if (!row) return ""
  if (row.value_text) return row.value_text
  if (row.file_url) return row.file_url
  if (row.value_json != null) {
    return typeof row.value_json === "string" ? row.value_json : JSON.stringify(row.value_json)
  }
  return ""
}

function renderFinancialRequestValues(r, t) {
  const rows = []
  for (const row of r.values ?? []) {
    const val = frFieldValue(row)
    if (!val) continue
    if (isReceiptValueField({ ...row, value_text: row.value_text, file_url: row.file_url })) {
      continue
    }
    if (looksLikeAssetUrl(val)) continue
    const label = row.label ?? row.field_key
    rows.push(
      <div key={row.field_key}>
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="font-medium break-words">{val}</dd>
      </div>,
    )
  }
  return rows
}

export function FinanceApprovalQueues() {
  const { t, i18n } = useTranslation()
  const canFinance = usePermission("finance.approve_charge")
  const queryClient = useQueryClient()
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState("")
  const [approveTarget, setApproveTarget] = useState(null)
  const [approvalNote, setApprovalNote] = useState("")
  const isAr = i18n.language?.startsWith("ar")

  const labelRequestType = (type) => t(`finance.requestType.${type}`, type)
  const labelRequestStatus = (status) => t(`finance.requestStatus.${status}`, status)

  const { data: orderPaymentFieldDefs = [] } = useQuery({
    queryKey: ["admin", "payment-methods", "order_payment"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/finance/payment-methods", {
        params: { context: "order_payment" },
      })
      const methods = data?.data ?? []
      const direct = methods.find((m) => m.code === "direct_transfer") ?? methods[0]
      return (direct?.fields ?? [])
        .filter((f) => f.context === "order_payment")
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    },
    enabled: canFinance,
  })

  const fieldLabels = useMemo(() => {
    const map = {}
    for (const f of orderPaymentFieldDefs) {
      map[f.field_key] = (isAr ? f.label_ar : f.label_en) || f.label_ar || f.field_key
    }
    return map
  }, [orderPaymentFieldDefs, isAr])

  const { data: requests, isLoading: loadingReq } = useQuery({
    queryKey: ["admin", "finance-requests"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/finance/requests", { params: { status: "pending", per_page: 50 } })
      return data?.data ?? []
    },
    enabled: canFinance,
  })

  const { data: orderPaymentsRaw, isLoading: loadingOp } = useQuery({
    queryKey: ["admin", "order-payments"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/finance/order-payments", { params: { status: "pending" } })
      return data
    },
    enabled: canFinance,
  })

  const orderPayments = Array.isArray(orderPaymentsRaw?.data)
    ? orderPaymentsRaw.data
    : Array.isArray(orderPaymentsRaw)
      ? orderPaymentsRaw
      : []

  const approveFr = useMutation({
    mutationFn: ({ id, approval_note }) =>
      apiClient.post(`/admin/finance/requests/${id}/approve`, { approval_note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "finance-requests"] })
      setApproveTarget(null)
      setApprovalNote("")
      toast.success(t("admin.approved", "Approved"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  const rejectFr = useMutation({
    mutationFn: ({ id, reason }) =>
      apiClient.post(`/admin/finance/requests/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "finance-requests"] })
      setRejectTarget(null)
      setRejectReason("")
      toast.success(t("admin.rejected", "Rejected"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  const approveOp = useMutation({
    mutationFn: (id) => apiClient.post(`/admin/finance/order-payments/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "order-payments"] })
      toast.success(t("admin.approved", "Approved"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  const rejectOp = useMutation({
    mutationFn: ({ id, reason }) =>
      apiClient.post(`/admin/finance/order-payments/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "order-payments"] })
      setRejectTarget(null)
      setRejectReason("")
      toast.success(t("admin.rejected", "Rejected"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  function renderOrderPaymentValues(op) {
    const shownKeys = new Set()
    const rows = []

    for (const def of orderPaymentFieldDefs) {
      const val = opFieldValue(op, def.field_key)
      if (!val) continue
      shownKeys.add(def.field_key)
      const label = fieldLabels[def.field_key] ?? def.field_key
      const isFile = isFileFieldType(def.field_type) || def.field_key.includes("receipt") || def.field_key.includes("url")
      rows.push(
        <div key={def.field_key}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium">
            {isFile && val.startsWith("http") ? (
              <a
                href={val}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
              >
                <ExternalLink className="size-3.5" />
                {t("admin.viewReceipt", "View receipt")}
              </a>
            ) : (
              val
            )}
          </dd>
        </div>,
      )
    }

    for (const row of op.values ?? []) {
      if (shownKeys.has(row.field_key)) continue
      const val = opFieldValue(op, row.field_key)
      if (!val) continue
      rows.push(
        <div key={row.field_key}>
          <dt className="text-muted-foreground">{row.field_key}</dt>
          <dd className="font-medium break-all">{val}</dd>
        </div>,
      )
    }

    return rows
  }

  if (!canFinance) {
    return <p className="text-sm text-muted-foreground">{t("admin.noPermission")}</p>
  }

  const submitReject = () => {
    if (!rejectTarget || !rejectReason.trim()) return
    if (rejectTarget.kind === "request") {
      rejectFr.mutate({ id: rejectTarget.id, reason: rejectReason.trim() })
    } else {
      rejectOp.mutate({ id: rejectTarget.id, reason: rejectReason.trim() })
    }
  }

  const submitApprove = () => {
    if (!approveTarget || !approvalNote.trim()) {
      toast.error(t("admin.financeApprovalNoteRequired", "Describe how you verified this request."))
      return
    }
    approveFr.mutate({ id: approveTarget.id, approval_note: approvalNote.trim() })
  }

  const isCharge = approveTarget?.type === "wallet_charge"

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("admin.financeQueuesDesc")}</p>

      <div className="space-y-3">
        <h2 className="text-base font-semibold">{t("admin.financialRequests", "Financial requests")}</h2>
        {loadingReq ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : null}
        {(requests ?? []).length === 0 && !loadingReq ? (
          <p className="text-sm text-muted-foreground">{t("admin.noPendingItems", "No pending items")}</p>
        ) : null}
        {(requests ?? []).map((r) => {
          const valueRows = renderFinancialRequestValues(r, t)
          return (
            <Card key={r.id}>
              <CardHeader className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">
                    {labelRequestType(r.type)} — {Number(r.amount ?? 0).toLocaleString()}{" "}
                    {t("common.currencySar", "ر.س")}
                  </CardTitle>
                  {r.user ? (
                    <p className="text-sm text-muted-foreground">
                      {r.user.name} ({r.user.email})
                      {r.user.phone ? ` · ${r.user.phone}` : ""}
                    </p>
                  ) : null}
                  {r.payment_method?.name ? (
                    <Badge variant="outline">{r.payment_method.name}</Badge>
                  ) : null}
                </div>
                <Badge>{labelRequestStatus(r.status)}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {valueRows.length > 0 ? (
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">{valueRows}</dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("admin.payoutProfileNoValues", "No field values submitted.")}
                  </p>
                )}
                <TransferReceiptDocument href={extractReceiptHref(r)} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setApproveTarget(r)} disabled={approveFr.isPending}>
                    {t("admin.approve", "Approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejectTarget({ kind: "request", id: r.id })}
                  >
                    {t("admin.reject", "Reject")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t("admin.orderTransfers", "Transfer receipts")}</h2>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/finance-ops?tab=order-payment-form">
              {t("admin.managePayoutFormFields", "Manage form fields")}
            </Link>
          </Button>
        </div>
        {loadingOp ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : null}
        {orderPayments.length === 0 && !loadingOp ? (
          <p className="text-sm text-muted-foreground">{t("admin.noPendingItems", "No pending items")}</p>
        ) : null}
        {orderPayments.map((op) => {
          const valueRows = renderOrderPaymentValues(op)
          const purchase = op.purchase
          return (
            <Card key={op.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 py-3">
                <CardTitle className="text-base">
                  #{op.id} — {op.amount} {t("common.currencySar", "ر.س")}
                  {purchase?.product?.title ? (
                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                      {purchase.product.title}
                    </span>
                  ) : null}
                </CardTitle>
                <Badge>{labelRequestStatus(op.status)}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {valueRows.length > 0 ? (
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">{valueRows}</dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("admin.payoutProfileNoValues", "No field values submitted.")}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => approveOp.mutate(op.id)} disabled={approveOp.isPending}>
                    {t("admin.approve", "Approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejectTarget({ kind: "order_payment", id: op.id })}
                  >
                    {t("admin.reject", "Reject")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog
        open={Boolean(approveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setApproveTarget(null)
            setApprovalNote("")
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCharge
                ? t("admin.financeApproveChargeTitle", "Approve wallet top-up")
                : t("admin.financeApproveWithdrawTitle", "Approve withdrawal")}
            </DialogTitle>
            <DialogDescription>
              {isCharge
                ? t(
                    "admin.financeApproveChargeDesc",
                    "Confirm you received the transfer to the platform account before crediting the member wallet.",
                  )
                : t(
                    "admin.financeApproveWithdrawDesc",
                    "Confirm you sent the payout to the member's bank account before completing this request.",
                  )}
            </DialogDescription>
          </DialogHeader>
          {approveTarget ? (
            <div className="space-y-4 text-sm">
              <dl className="grid gap-2 sm:grid-cols-2 rounded-lg border bg-muted/40 p-3">
                {renderFinancialRequestValues(approveTarget, t)}
              </dl>
              <TransferReceiptDocument
                href={extractReceiptHref(approveTarget)}
                showPreview
              />
              <div className="space-y-2">
                <Label htmlFor="approval-note">{t("admin.financeApprovalNote", "How did you verify this?")}</Label>
                <Textarea
                  id="approval-note"
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder={
                    isCharge
                      ? t(
                          "admin.financeApprovalNoteChargePlaceholder",
                          "e.g. Bank transfer ref 12345 verified in platform account",
                        )
                      : t(
                          "admin.financeApprovalNoteWithdrawPlaceholder",
                          "e.g. Transferred to IBAN … on …",
                        )
                  }
                  rows={3}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setApproveTarget(null)
                setApprovalNote("")
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" disabled={approveFr.isPending} onClick={submitApprove}>
              {approveFr.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("admin.approve", "Approve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.rejectRequest", "Reject request")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">{t("admin.rejectReason", "Reason")}</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!rejectReason.trim() || rejectFr.isPending || rejectOp.isPending}
              onClick={submitReject}
            >
              {t("admin.reject", "Reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
