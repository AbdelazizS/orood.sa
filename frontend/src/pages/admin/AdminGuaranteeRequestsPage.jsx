import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import apiClient from "@/lib/apiClient"
import { Loader2, Shield, Wallet, Landmark } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { usePermission } from "@/hooks/usePermission"

const FUNDING_PLATFORM = "platform_wallet"
const FUNDING_EXTERNAL = "external"

export function AdminGuaranteeRequestsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusId = (searchParams.get("focus") || "").trim()
  const queryClient = useQueryClient()
  const canReview = usePermission("compliance.review_guarantee_requests")
  const [rejectId, setRejectId] = useState(null)
  const [rejectNote, setRejectNote] = useState("")
  const [approveRow, setApproveRow] = useState(null)
  const [fundingSource, setFundingSource] = useState(FUNDING_PLATFORM)
  const [approvalNote, setApprovalNote] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "guarantee-requests"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/admin/guarantee-requests", { params: { status: "pending", per_page: 50 } })
      return res?.data ?? []
    },
    enabled: canReview,
  })

  const approveAmount = approveRow?.amount != null ? Number(approveRow.amount) : 0
  const memberBalance = approveRow?.member_available_balance != null ? Number(approveRow.member_available_balance) : 0
  const walletCoversDeposit = memberBalance >= approveAmount

  const defaultFundingSource = useMemo(() => {
    if (!approveRow || approveRow.type !== "deposit") return FUNDING_PLATFORM
    return walletCoversDeposit ? FUNDING_PLATFORM : FUNDING_EXTERNAL
  }, [approveRow, walletCoversDeposit])

  useEffect(() => {
    if (!focusId || !data?.length) return
    const el = document.getElementById(`guarantee-row-${focusId}`)
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [focusId, data])

  useEffect(() => {
    if (approveRow) {
      setFundingSource(defaultFundingSource)
      setApprovalNote("")
    }
  }, [approveRow, defaultFundingSource])

  const closeApproveDialog = () => {
    setApproveRow(null)
    setFundingSource(FUNDING_PLATFORM)
    setApprovalNote("")
  }

  const approveMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.post(`/admin/guarantee-requests/${id}/approve`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "guarantee-requests"] })
      closeApproveDialog()
      toast.success(t("admin.guaranteeRequestApproved"))
    },
    onError: (err) => {
      const body = err?.response?.data
      const code = body?.code
      if (code === "INSUFFICIENT_WALLET_FOR_GUARANTEE" && approveRow) {
        setFundingSource(FUNDING_EXTERNAL)
        toast.error(
          t("admin.guaranteeApproveInsufficientWallet", {
            available: Number(body.member_available_balance ?? 0).toLocaleString(),
            amount: Number(body.requested_amount ?? approveAmount).toLocaleString(),
            defaultValue: `Wallet balance (${body.member_available_balance}) is less than the requested amount. Choose external payment if you received funds outside the platform.`,
          }),
        )
        return
      }
      const msg = body?.message
      toast.error(typeof msg === "string" ? msg : t("common.error"))
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }) => apiClient.post(`/admin/guarantee-requests/${id}/reject`, { admin_note: note || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "guarantee-requests"] })
      setRejectId(null)
      setRejectNote("")
      toast.success(t("admin.guaranteeRequestRejected"))
    },
    onError: (err) => {
      const msg = err?.response?.data?.message
      toast.error(typeof msg === "string" ? msg : t("common.error"))
    },
  })

  const openApprove = (row) => {
    if (row.type === "refund") {
      approveMutation.mutate({ id: row.id, payload: {} })
      return
    }
    setApproveRow(row)
  }

  const submitApprove = () => {
    if (!approveRow) return
    if (fundingSource === FUNDING_PLATFORM && !walletCoversDeposit) {
      toast.error(t("admin.guaranteeApprovePickExternal", "Choose external payment — member wallet balance is insufficient."))
      return
    }
    if (fundingSource === FUNDING_EXTERNAL && !approvalNote.trim()) {
      toast.error(t("admin.guaranteeApproveNoteRequired", "Describe how payment was received (bank transfer, cash, etc.)."))
      return
    }
    approveMutation.mutate({
      id: approveRow.id,
      payload: {
        funding_source: fundingSource,
        approval_note: approvalNote.trim() || null,
      },
    })
  }

  if (!canReview) {
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
        <Shield className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t("admin.guaranteeRequestsTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin.guaranteeRequestsIntro")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.guaranteeRequestsPending")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!data?.length ? (
            <p className="text-sm text-muted-foreground">{t("admin.guaranteeRequestsEmpty")}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {data.map((row) => (
                <li
                  key={row.id}
                  id={`guarantee-row-${row.id}`}
                  className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${String(row.id) === focusId ? "bg-primary/5 ring-2 ring-primary/40 ring-inset" : ""}`}
                >
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">
                      {row.user?.name ?? "—"} <span className="text-muted-foreground">({row.user?.email})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{row.type === "deposit" ? t("admin.guaranteeRequestTypeDeposit") : t("admin.guaranteeRequestTypeRefund")}</Badge>
                      {row.amount != null && (
                        <Badge variant="secondary">
                          {Number(row.amount).toLocaleString()} {t("common.currency")}
                        </Badge>
                      )}
                      {row.type === "deposit" && row.member_available_balance != null && (
                        <Badge variant="outline" className="font-normal">
                          {t("admin.guaranteeMemberWallet", "Wallet")}: {Number(row.member_available_balance).toLocaleString()} {t("common.currency")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/admin/messages?user_email=${encodeURIComponent(row.user?.email ?? "")}&source=guarantee_request&guarantee_request_id=${row.id}`,
                        )
                      }
                    >
                      {t("admin.contactClient", "Contact client")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openApprove(row)}
                      disabled={approveMutation.isPending}
                    >
                      {t("admin.guaranteeRequestApprove")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejectId(row.id)}>
                      {t("admin.guaranteeRequestReject")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={approveRow != null} onOpenChange={(o) => !o && closeApproveDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.guaranteeApproveModalTitle", "Approve guarantee deposit")}</DialogTitle>
            <DialogDescription>
              {t(
                "admin.guaranteeApproveModalDesc",
                "Choose where this deposit is funded. Use external payment when you confirmed receipt via bank transfer, cash, or after contacting the member.",
              )}
            </DialogDescription>
          </DialogHeader>

          {approveRow && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
                <p>
                  <span className="text-muted-foreground">{t("admin.guaranteeApproveMember", "Member")}: </span>
                  {approveRow.user?.name} ({approveRow.user?.email})
                </p>
                <p>
                  <span className="text-muted-foreground">{t("admin.guaranteeApproveAmount", "Amount")}: </span>
                  <strong>{approveAmount.toLocaleString()} {t("common.currency")}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">{t("admin.guaranteeMemberWallet", "Platform wallet")}: </span>
                  {memberBalance.toLocaleString()} {t("common.currency")}
                  {!walletCoversDeposit && (
                    <span className="ms-2 text-amber-600 dark:text-amber-400">
                      ({t("admin.guaranteeWalletInsufficient", "insufficient for this deposit")})
                    </span>
                  )}
                </p>
              </div>

              <RadioGroup value={fundingSource} onValueChange={setFundingSource} className="gap-3">
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <RadioGroupItem value={FUNDING_PLATFORM} id="fund-wallet" className="mt-1" disabled={!walletCoversDeposit} />
                  <Label htmlFor="fund-wallet" className={`flex-1 cursor-pointer ${!walletCoversDeposit ? "opacity-50" : ""}`}>
                    <span className="flex items-center gap-2 font-medium">
                      <Wallet className="size-4" />
                      {t("admin.guaranteeFundingPlatform", "Platform wallet")}
                    </span>
                    <span className="block text-xs text-muted-foreground font-normal mt-1">
                      {t("admin.guaranteeFundingPlatformHint", "Deduct from the member's available wallet balance on Orood.")}
                    </span>
                  </Label>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <RadioGroupItem value={FUNDING_EXTERNAL} id="fund-external" className="mt-1" />
                  <Label htmlFor="fund-external" className="flex-1 cursor-pointer">
                    <span className="flex items-center gap-2 font-medium">
                      <Landmark className="size-4" />
                      {t("admin.guaranteeFundingExternal", "External payment")}
                    </span>
                    <span className="block text-xs text-muted-foreground font-normal mt-1">
                      {t(
                        "admin.guaranteeFundingExternalHint",
                        "Member paid outside the wallet (bank transfer, cash, etc.) — you verified with the client.",
                      )}
                    </span>
                  </Label>
                </div>
              </RadioGroup>

              {fundingSource === FUNDING_EXTERNAL && (
                <div className="space-y-2">
                  <Label htmlFor="approval-note">{t("admin.guaranteeApprovalNote", "How was payment received?")}</Label>
                  <Textarea
                    id="approval-note"
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    placeholder={t("admin.guaranteeApprovalNotePlaceholder", "e.g. Bank transfer ref 12345, confirmed via phone on …")}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeApproveDialog}>
              {t("common.cancel")}
            </Button>
            <Button disabled={approveMutation.isPending} onClick={submitApprove}>
              {approveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("admin.guaranteeRequestApprove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectId != null} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.guaranteeRequestRejectTitle")}</DialogTitle>
          </DialogHeader>
          <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder={t("admin.guaranteeRequestRejectNote")} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={() => rejectId && rejectMutation.mutate({ id: rejectId, note: rejectNote })}
            >
              {t("admin.guaranteeRequestReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
