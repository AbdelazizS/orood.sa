import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import apiClient from "@/lib/apiClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { usePermission } from "@/hooks/usePermission"

function fieldValue(profile, key) {
  const row = profile?.values?.find((v) => v.field_key === key)
  if (!row) return ""
  if (row.value_text) return row.value_text
  if (row.value_json != null) {
    return typeof row.value_json === "string" ? row.value_json : JSON.stringify(row.value_json)
  }
  if (row.file_url) return row.file_url
  return ""
}

export function PayoutProfilesQueue() {
  const { t, i18n } = useTranslation()
  const canFinance = usePermission("finance.approve_charge")
  const queryClient = useQueryClient()
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState("")
  const isAr = i18n.language?.startsWith("ar")

  const { data: fieldDefs = [] } = useQuery({
    queryKey: ["admin", "payment-methods", "payout_profile"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/finance/payment-methods", {
        params: { context: "payout_profile" },
      })
      const methods = data?.data ?? []
      const direct = methods.find((m) => m.code === "direct_transfer") ?? methods[0]
      return (direct?.fields ?? [])
        .filter((f) => f.context === "payout_profile")
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    },
    enabled: canFinance,
  })

  const fieldLabels = useMemo(() => {
    const map = {}
    for (const f of fieldDefs) {
      map[f.field_key] = (isAr ? f.label_ar : f.label_en) || f.label_ar || f.field_key
    }
    return map
  }, [fieldDefs, isAr])

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "payout-profiles", "pending_review"],
    queryFn: async () => {
      const { data: body } = await apiClient.get("/admin/finance/payout-profiles", {
        params: { status: "pending_review" },
      })
      return body
    },
    enabled: canFinance,
  })

  const profiles = Array.isArray(data?.data) ? data.data : []

  const verifyMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/admin/finance/payout-profiles/${id}/verify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payout-profiles"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "settings", "payments"] })
      toast.success(t("admin.approved", "Approved"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      apiClient.post(`/admin/finance/payout-profiles/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payout-profiles"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "settings", "payments"] })
      setRejectTarget(null)
      setRejectReason("")
      toast.success(t("admin.rejected", "Rejected"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  function renderProfileValues(profile) {
    const shownKeys = new Set()
    const rows = []

    for (const def of fieldDefs) {
      const val = fieldValue(profile, def.field_key)
      if (!val) continue
      shownKeys.add(def.field_key)
      rows.push(
        <div key={def.field_key}>
          <dt className="text-muted-foreground">{fieldLabels[def.field_key] ?? def.field_key}</dt>
          <dd className={def.field_type === "iban" ? "font-mono text-xs font-medium" : "font-medium"}>
            {val}
          </dd>
        </div>,
      )
    }

    for (const row of profile.values ?? []) {
      if (shownKeys.has(row.field_key)) continue
      const val = fieldValue(profile, row.field_key)
      if (!val) continue
      rows.push(
        <div key={row.field_key}>
          <dt className="text-muted-foreground">{row.field_key}</dt>
          <dd className="font-medium">{val}</dd>
        </div>,
      )
    }

    return rows
  }

  if (!canFinance) {
    return <p className="text-sm text-muted-foreground">{t("admin.noPermission")}</p>
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">
            {t("admin.payoutProfilesQueueTitle", "Seller bank accounts (direct transfer)")}
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/finance-ops?tab=payout-form">
              {t("admin.managePayoutFormFields", "Manage form fields")}
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          ) : profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.queueEmpty", "No pending items")}</p>
          ) : (
            profiles.map((profile) => {
              const seller = profile.user
              const valueRows = renderProfileValues(profile)
              return (
                <div key={profile.user_id} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{seller?.name ?? seller?.email ?? `#${profile.user_id}`}</p>
                      {seller?.email ? (
                        <p className="text-xs text-muted-foreground">{seller.email}</p>
                      ) : null}
                    </div>
                    <Badge variant="secondary">{profile.status}</Badge>
                  </div>
                  {valueRows.length > 0 ? (
                    <dl className="grid gap-2 text-sm sm:grid-cols-2">{valueRows}</dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("admin.payoutProfileNoValues", "No field values submitted.")}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => verifyMutation.mutate(profile.user_id)}
                      disabled={verifyMutation.isPending}
                    >
                      {t("admin.approve", "Approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectTarget(profile)}
                      disabled={rejectMutation.isPending}
                    >
                      {t("admin.reject", "Reject")}
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.rejectPayoutProfile", "Reject bank account")}</DialogTitle>
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
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() =>
                rejectMutation.mutate({ id: rejectTarget.user_id, reason: rejectReason.trim() })
              }
            >
              {t("admin.reject", "Reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
