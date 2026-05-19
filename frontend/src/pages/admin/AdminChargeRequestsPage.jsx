import { useEffect, useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import apiClient from "@/lib/apiClient"
import { looksLikeAssetUrl } from "@/lib/imageUrl"
import { chargeFieldLabel } from "@/lib/finance/chargeFieldLabels"
import {
  TransferReceiptDocument,
  extractReceiptHref,
  isReceiptValueField,
} from "@/components/finance/TransferReceiptDocument"
import { Loader2, Wallet, Check, X } from "lucide-react"
import { toast } from "sonner"
import { usePermission } from "@/hooks/usePermission"

function fieldDisplayValue(row) {
  if (!row || isReceiptValueField(row)) return ""
  if (row.value_text) return row.value_text
  return ""
}

export function AdminChargeRequestsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusId = (searchParams.get("focus") || "").trim()
  const queryClient = useQueryClient()
  const canApprove = usePermission("finance.approve_charge")
  const [rejectId, setRejectId] = useState(null)
  const [rejectReason, setRejectReason] = useState("")
  const [approveTarget, setApproveTarget] = useState(null)
  const [approvalNote, setApprovalNote] = useState("")
  const [reviewConfirmed, setReviewConfirmed] = useState(false)

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
    mutationFn: ({ id, approval_note }) =>
      apiClient.post(`/admin/charge-requests/${id}/approve`, { approval_note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "charge-requests"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "finance-requests"] })
      setApproveTarget(null)
      setApprovalNote("")
      setReviewConfirmed(false)
      toast.success(t("admin.approved", "تمت الموافقة"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      apiClient.post(`/admin/charge-requests/${id}/reject`, { reason: reason || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "charge-requests"] })
      setRejectId(null)
      setRejectReason("")
      toast.success(t("admin.rejected", "تم الرفض"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  const closeApproveModal = () => {
    setApproveTarget(null)
    setApprovalNote("")
    setReviewConfirmed(false)
  }

  const submitApprove = () => {
    if (!approveTarget) return
    if (!reviewConfirmed) {
      toast.error(t("admin.chargeApproveConfirmRequired"))
      return
    }
    if (!approvalNote.trim()) {
      toast.error(t("admin.financeApprovalNoteRequired"))
      return
    }
    approveMutation.mutate({ id: approveTarget.id, approval_note: approvalNote.trim() })
  }

  const receiptUrl = useMemo(
    () => (approveTarget ? extractReceiptHref(approveTarget) : ""),
    [approveTarget],
  )

  const renderDetailFields = (row, { preview = false } = {}) => {
    const fields = (row.values ?? []).filter((v) => {
      const val = fieldDisplayValue(v)
      return val && !isReceiptValueField(v) && !looksLikeAssetUrl(val)
    })
    const receiptHref = extractReceiptHref(row)

    return (
      <>
        {fields.length > 0 ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2 rounded-lg border bg-muted/30 p-3">
            {fields.map((v) => (
              <div key={v.field_key}>
                <dt className="text-muted-foreground">{chargeFieldLabel(t, v)}</dt>
                <dd className="font-medium break-words">{fieldDisplayValue(v)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {receiptHref ? (
          <TransferReceiptDocument href={receiptHref} showPreview={preview} />
        ) : null}
      </>
    )
  }

  if (!canApprove) {
    return <div className="p-6 text-muted-foreground">{t("admin.noPermission")}</div>
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="size-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t("admin.chargeRequests")}</h1>
            <p className="text-sm text-muted-foreground">{t("admin.chargeRequestsIntro")}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/finance-ops?tab=queues">{t("admin.financeApprovalQueues")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.pendingChargesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!data?.length ? (
            <p className="text-sm text-muted-foreground">{t("admin.noPendingCharges")}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {data.map((row) => (
                <li
                  key={row.id}
                  id={`charge-row-${row.id}`}
                  className={`flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between ${String(row.id) === focusId ? "bg-primary/5 ring-2 ring-primary/40 ring-inset" : ""}`}
                >
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{t("admin.requestStatus.pending")}</Badge>
                      <span className="font-medium">
                        {row.user?.name ?? "—"}{" "}
                        <span className="text-muted-foreground font-normal">({row.user?.email})</span>
                      </span>
                    </div>
                    <p className="text-sm">
                      {t("common.amount")}:{" "}
                      <span className="font-semibold tabular-nums">
                        {Number(row.amount).toLocaleString()} {t("common.currencySar")}
                      </span>
                    </p>
                    {row.payment_method_label ? (
                      <p className="text-sm text-muted-foreground">
                        {t("admin.paymentMethodLabel")}:{" "}
                        <Badge variant="outline">{row.payment_method_label}</Badge>
                      </p>
                    ) : null}
                    {renderDetailFields(row)}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-stretch">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        navigate(
                          `/admin/messages?user_email=${encodeURIComponent(row.user?.email ?? "")}&source=charge_request&charge_id=${row.id}`,
                        )
                      }
                    >
                      {t("admin.contactClient")}
                    </Button>
                    <Button size="sm" className="w-full sm:w-auto" onClick={() => setApproveTarget(row)}>
                      <Check className="me-1 size-4" />
                      {t("admin.reviewAndApprove")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={rejectMutation.isPending}
                      onClick={() => setRejectId(row.id)}
                    >
                      <X className="me-1 size-4" />
                      {t("common.reject")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(approveTarget)} onOpenChange={(open) => !open && closeApproveModal()}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.financeApproveChargeTitle")}</DialogTitle>
            <DialogDescription>{t("admin.financeApproveChargeDesc")}</DialogDescription>
          </DialogHeader>
          {approveTarget ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                <p className="font-medium">{approveTarget.user?.name}</p>
                <p className="text-muted-foreground">{approveTarget.user?.email}</p>
                <p>
                  {t("common.amount")}:{" "}
                  <span className="font-semibold tabular-nums">
                    {Number(approveTarget.amount).toLocaleString()} {t("common.currencySar")}
                  </span>
                </p>
                {approveTarget.payment_method_label ? (
                  <p className="text-muted-foreground">
                    {t("admin.paymentMethodLabel")}: {approveTarget.payment_method_label}
                  </p>
                ) : null}
              </div>
              {renderDetailFields(approveTarget, { preview: true })}
              {!receiptUrl ? (
                <p className="text-sm text-amber-600">{t("admin.chargeNoReceiptWarning")}</p>
              ) : null}
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox
                  id="charge-review-confirmed"
                  checked={reviewConfirmed}
                  onCheckedChange={(c) => setReviewConfirmed(Boolean(c))}
                />
                <Label htmlFor="charge-review-confirmed" className="text-sm font-normal leading-snug cursor-pointer">
                  {t("admin.chargeApproveConfirmCheckbox")}
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="charge-approval-note">{t("admin.financeApprovalNote")}</Label>
                <Textarea
                  id="charge-approval-note"
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder={t("admin.financeApprovalNoteChargePlaceholder")}
                  rows={3}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeApproveModal}>
              {t("common.cancel")}
            </Button>
            <Button type="button" disabled={approveMutation.isPending} onClick={submitApprove}>
              {approveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("admin.approve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectId != null} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.rejectCharge")}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={t("admin.rejectionReason")}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setRejectId(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={() => rejectId && rejectMutation.mutate({ id: rejectId, reason: rejectReason })}
            >
              {t("common.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
