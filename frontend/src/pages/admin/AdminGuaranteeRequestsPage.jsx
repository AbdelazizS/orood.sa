import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import apiClient from "@/lib/apiClient"
import { Loader2, Shield } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { usePermission } from "@/hooks/usePermission"

export function AdminGuaranteeRequestsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusId = (searchParams.get("focus") || "").trim()
  const queryClient = useQueryClient()
  const canReview = usePermission("compliance.review_guarantee_requests")
  const [rejectId, setRejectId] = useState(null)
  const [rejectNote, setRejectNote] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "guarantee-requests"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/admin/guarantee-requests", { params: { status: "pending", per_page: 50 } })
      return res?.data ?? []
    },
    enabled: canReview,
  })

  useEffect(() => {
    if (!focusId || !data?.length) return
    const el = document.getElementById(`guarantee-row-${focusId}`)
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [focusId, data])

  const approveMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/admin/guarantee-requests/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "guarantee-requests"] })
      toast.success(t("admin.guaranteeRequestApproved"))
    },
    onError: (err) => {
      const msg = err?.response?.data?.message
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
                    <Button size="sm" onClick={() => approveMutation.mutate(row.id)} disabled={approveMutation.isPending}>
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
