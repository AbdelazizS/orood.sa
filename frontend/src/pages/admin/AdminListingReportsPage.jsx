import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable } from "@/components/ui/data-table"
import apiClient from "@/lib/apiClient"
import { toast } from "sonner"

const REPORT_UPDATE_ERROR_KEYS = {
  "Invalid status transition": "admin.reportUpdateErrors.invalidStatusTransition",
  "action_type is required for action_taken status": "admin.reportUpdateErrors.actionTypeRequired",
}
import {
  Loader2,
  Pencil,
  Search,
  Flag,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Gavel,
  Archive,
} from "lucide-react"

const STATUSES = ["new", "investigating", "action_taken", "rejected", "closed"]
const ACTION_TYPES = ["hide_listing", "unpublish_listing", "flag_review"]
const SORT_PARAM = "-created_at"

function truncate(str, max) {
  if (!str || typeof str !== "string") return ""
  const t = str.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

function translateProductStatus(t, value) {
  if (!value) return ""
  const key = `admin.productStatus.${value}`
  const tr = t(key)
  return tr !== key ? tr : value
}

function translateModerationStatus(t, value) {
  if (!value) return ""
  const key = `admin.moderationStatus.${value}`
  const tr = t(key)
  return tr !== key ? tr : value
}

function statusBadgeVariant(status) {
  switch (status) {
    case "new":
      return "default"
    case "investigating":
      return "secondary"
    case "action_taken":
      return "destructive"
    case "rejected":
      return "outline"
    case "closed":
      return "secondary"
    default:
      return "secondary"
  }
}

function reportColumns(t, { onEdit }) {
  return [
    {
      id: "id",
      header: t("admin.reportId", "ID"),
      enableHiding: true,
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">#{row.original.id}</span>,
    },
    {
      id: "listing",
      header: t("admin.listing", "Listing"),
      cell: ({ row }) => {
        const p = row.original.product
        const seller = p?.seller
        if (!p?.id) return "—"
        return (
          <div className="min-w-0 max-w-[220px]">
            <Link to={`/products/${p.id}`} className="font-medium text-primary hover:underline block truncate">
              {p.title ?? "—"}
            </Link>
            {seller?.name && (
              <p className="text-xs text-muted-foreground truncate">
                {t("admin.listingOwner", "Owner")}: {seller.name}
              </p>
            )}
          </div>
        )
      },
    },
    {
      id: "listing_state",
      header: t("admin.listingState", "Listing state"),
      enableHiding: true,
      cell: ({ row }) => {
        const p = row.original.product
        if (!p) return "—"
        return (
          <div className="flex min-w-[140px] max-w-[200px] flex-col gap-1.5 text-xs">
            {p.status ? (
              <div className="leading-tight">
                <span className="text-muted-foreground">{t("admin.listingPublicationShort", "Publication")}: </span>
                <Badge variant="outline" className="ms-0.5 align-middle text-[10px] font-normal">
                  {translateProductStatus(t, p.status)}
                </Badge>
              </div>
            ) : null}
            {p.moderation_status ? (
              <div className="leading-tight">
                <span className="text-muted-foreground">{t("admin.listingModerationShort", "Moderation")}: </span>
                <Badge variant="secondary" className="ms-0.5 align-middle text-[10px] font-normal">
                  {translateModerationStatus(t, p.moderation_status)}
                </Badge>
              </div>
            ) : null}
            {!p.status && !p.moderation_status ? "—" : null}
          </div>
        )
      },
    },
    {
      id: "reporter",
      header: t("admin.reporter", "Reporter"),
      cell: ({ row }) => {
        const u = row.original.user
        const email = row.original.email
        if (u) {
          return (
            <div className="min-w-0 max-w-[180px]">
              <span className="block truncate text-sm font-medium">{u.name ?? "—"}</span>
              <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
            </div>
          )
        }
        if (email) {
          return <span className="text-sm text-muted-foreground">{email}</span>
        }
        return "—"
      },
    },
    {
      id: "reason",
      header: t("admin.reason", "Reason"),
      enableHiding: true,
      cell: ({ row }) => {
        const r = row.original.reason
        if (!r) return "—"
        const key = `listingDetail.reportReasons.${r}`
        const translated = t(key)
        return <span className="max-w-[140px] truncate block text-sm">{translated !== key ? translated : r}</span>
      },
    },
    {
      id: "message",
      header: t("admin.message", "Message"),
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate block text-sm text-muted-foreground" title={row.original.message}>
          {truncate(row.original.message, 90)}
        </span>
      ),
    },
    {
      id: "assignee",
      header: t("admin.assignee", "Assignee"),
      enableHiding: true,
      cell: ({ row }) => <span className="text-sm">{row.original.assignedTo?.name ?? "—"}</span>,
    },
    {
      id: "status",
      header: t("admin.status", "Status"),
      cell: ({ row }) => {
        const s = row.original.status
        const labelKey = `admin.reportStatus.${s}`
        const label = t(labelKey, s)
        return <Badge variant={statusBadgeVariant(s)}>{label}</Badge>
      },
    },
    {
      id: "created_at",
      header: t("admin.date", "Date"),
      enableHiding: true,
      cell: ({ row }) =>
        row.original.created_at ? new Date(row.original.created_at).toLocaleString() : "—",
    },
    {
      id: "reviewed_at",
      header: t("admin.reviewedAt", "Reviewed"),
      enableHiding: true,
      cell: ({ row }) =>
        row.original.reviewed_at ? new Date(row.original.reviewed_at).toLocaleString() : "—",
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => onEdit(row.original)}>
          <Pencil className="size-4" />
        </Button>
      ),
    },
  ]
}

export function AdminListingReportsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [editingReport, setEditingReport] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "listing-reports", statusFilter, assigneeFilter, debouncedSearch, page, perPage],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (assigneeFilter === "unassigned") params.set("assigned_to", "unassigned")
      else if (assigneeFilter !== "all") params.set("assigned_to", assigneeFilter)
      if (debouncedSearch) params.set("search", debouncedSearch)
      params.set("page", String(page))
      params.set("per_page", String(perPage))
      params.set("sort", SORT_PARAM)
      const { data: res } = await apiClient.get(`/admin/listing-reports?${params.toString()}`)
      return res ?? {}
    },
  })

  const { data: assignees = [] } = useQuery({
    queryKey: ["admin", "listing-reports", "assignees"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/admin/listing-reports/assignees")
      return res?.data ?? []
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.put(`/admin/listing-reports/${id}`, payload),
    onSuccess: () => {
      setEditingReport(null)
      queryClient.invalidateQueries({ queryKey: ["admin", "listing-reports"] })
      toast.success(t("admin.reportUpdated", "Report updated"))
    },
    onError: (err) => {
      const raw = err?.response?.data?.message ?? err?.message ?? t("common.error")
      const i18nKey = typeof raw === "string" ? REPORT_UPDATE_ERROR_KEYS[raw] : null
      const message = i18nKey ? t(i18nKey) : typeof raw === "string" ? raw : t("common.error")
      toast.error(message)
    },
  })

  const handleEdit = useCallback((row) => {
    setEditingReport(row)
  }, [])

  const columns = useMemo(() => reportColumns(t, { onEdit: handleEdit }), [t, handleEdit])

  const reports = data?.data ?? []
  const meta = data?.meta ?? {}
  const counts = data?.counts ?? {}

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.listingReports", "Listing reports")}</h1>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0 w-full space-y-6">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{t("admin.listingReports", "Listing reports")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin.listingReportsDesc")}</p>
        </div>
        <div className="flex min-w-0 w-full flex-wrap items-center gap-2 lg:max-w-[min(100%,42rem)] lg:justify-end">
          <div className="relative min-w-0 w-full flex-1 sm:max-w-xs">
            <Search className="absolute start-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="ps-8"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                setPage(1)
              }}
              placeholder={t("admin.search", "Search...")}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full min-w-0 sm:w-[200px]">
              <SelectValue placeholder={t("admin.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`admin.reportStatus.${status}`, status)}
                  {counts[status] != null ? ` (${counts[status]})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={assigneeFilter}
            onValueChange={(v) => {
              setAssigneeFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full min-w-0 sm:w-[200px]">
              <SelectValue placeholder={t("admin.assignee", "Assignee")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.assigneeFilterAll", "All assignees")}</SelectItem>
              <SelectItem value="unassigned">{t("admin.assigneeFilterUnassigned", "Unassigned")}</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="rounded-lg bg-muted p-2.5">
              <Archive className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("admin.reportsCountAll", "Total")}</p>
              <p className="text-xl font-semibold tabular-nums">{counts.all ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Flag className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("admin.reportStatus.new")}</p>
              <p className="text-xl font-semibold tabular-nums">{counts.new ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="rounded-lg bg-amber-500/10 p-2.5">
              <AlertCircle className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("admin.reportStatus.investigating")}</p>
              <p className="text-xl font-semibold tabular-nums">{counts.investigating ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="rounded-lg bg-destructive/10 p-2.5">
              <Gavel className="size-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("admin.reportStatus.action_taken")}</p>
              <p className="text-xl font-semibold tabular-nums">{counts.action_taken ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="rounded-lg bg-muted p-2.5">
              <XCircle className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("admin.reportStatus.rejected")}</p>
              <p className="text-xl font-semibold tabular-nums">{counts.rejected ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="rounded-lg bg-green-500/10 p-2.5">
              <CheckCircle2 className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("admin.reportStatus.closed")}</p>
              <p className="text-xl font-semibold tabular-nums">{counts.closed ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardContent className="min-w-0 overflow-x-auto p-0">
          <DataTable
            columns={columns}
            data={reports}
            pagination
            manualPagination
            pageSize={perPage}
            pageCount={meta.last_page ?? 1}
            pageIndex={page - 1}
            onPageChange={(idx) => setPage(idx + 1)}
            onPageSizeChange={(n) => {
              setPerPage(n)
              setPage(1)
            }}
            total={meta.total ?? 0}
          />
        </CardContent>
      </Card>

      {editingReport && (
        <ListingReportEditDialog
          key={editingReport.id}
          report={editingReport}
          assignees={assignees}
          isPending={updateMutation.isPending}
          onClose={() => setEditingReport(null)}
          onSave={(payload) => updateMutation.mutate({ id: editingReport.id, payload })}
        />
      )}
    </div>
  )
}

function ListingReportEditDialog({ report, assignees, isPending, onClose, onSave }) {
  const { t } = useTranslation()
  const reportId = report.id

  const [status, setStatus] = useState(report.status ?? "new")
  const [assignedTo, setAssignedTo] = useState(
    report.assigned_to ? String(report.assigned_to) : report.assignedTo?.id ? String(report.assignedTo.id) : "none"
  )
  const [actionType, setActionType] = useState(report.action_type && report.action_type !== "" ? report.action_type : "none")
  const [resolutionNote, setResolutionNote] = useState(report.resolution_note ?? "")

  const allowedNext = report.allowed_next_statuses ?? []
  const statusOptions = useMemo(() => Array.from(new Set([report.status, ...allowedNext].filter(Boolean))), [report.status, allowedNext])

  const requiresActionType = status === "action_taken"

  const payload = useMemo(
    () => ({
      status,
      assigned_to: assignedTo === "none" ? null : Number(assignedTo),
      action_type: requiresActionType ? (actionType === "none" ? null : actionType) : null,
      resolution_note: resolutionNote.trim() || null,
    }),
    [actionType, assignedTo, requiresActionType, resolutionNote, status]
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("admin.editReport", "Edit report")} #{reportId}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("admin.listing", "Listing")}</p>
                {report.product?.id ? (
                  <Link to={`/products/${report.product.id}`} className="text-primary hover:underline font-medium">
                    {report.product.title ?? "—"}
                  </Link>
                ) : (
                  <p>{report.product?.title ?? "—"}</p>
                )}
                {report.product?.seller?.name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("admin.listingOwner", "Owner")}: {report.product.seller.name}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("admin.reason", "Reason")}</p>
                <p className="text-sm">
                  {(() => {
                    const r = report.reason
                    if (!r) return "—"
                    const key = `listingDetail.reportReasons.${r}`
                    const tr = t(key)
                    return tr !== key ? tr : r
                  })()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("admin.message", "Message")}</p>
                <p className="rounded border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{report.message}</p>
              </div>
              <div>
                <Label>{t("admin.status", "Status")}</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`admin.reportStatus.${s}`, s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {allowedNext.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("admin.reportNextStepsHint", "Next steps: {{steps}}", {
                      steps: allowedNext.map((s) => t(`admin.reportStatus.${s}`, s)).join(", "),
                    })}
                  </p>
                )}
              </div>
              <div>
                <Label>{t("admin.assignee", "Assignee")}</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {assignees.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {requiresActionType && (
                <div>
                  <Label>{t("admin.actionType", "Action type")}</Label>
                  <Select value={actionType} onValueChange={setActionType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("common.none", "None")}</SelectItem>
                      {ACTION_TYPES.map((a) => (
                        <SelectItem key={a} value={a}>
                          {t(`admin.reportAction.${a}`, a)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>{t("admin.resolutionNote", "Resolution note")}</Label>
                <Textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => onSave(payload)}
                disabled={isPending || (requiresActionType && payload.action_type == null)}
              >
                {isPending && <Loader2 className="me-2 size-4 animate-spin" />}
                {t("common.save")}
              </Button>
            </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
