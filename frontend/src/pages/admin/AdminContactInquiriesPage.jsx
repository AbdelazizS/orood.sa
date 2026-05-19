import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { Mail, Loader2, ChevronLeft, ChevronRight, Pencil } from "lucide-react"

const INQUIRY_STATUSES = ["new", "in_progress", "resolved", "closed"]

export function AdminContactInquiriesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [editingInquiry, setEditingInquiry] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "contact-inquiries", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      params.set("page", String(page))
      const { data: res } = await apiClient.get(`/admin/contact-inquiries?${params}`)
      return res ?? {}
    },
  })

  const { data: assignees = [] } = useQuery({
    queryKey: ["admin", "contact-inquiries", "assignees"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/admin/contact-inquiries/assignees")
      return res?.data ?? []
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.put(`/admin/contact-inquiries/${id}`, payload),
    onSuccess: () => {
      setEditingInquiry(null)
      queryClient.refetchQueries({ queryKey: ["admin", "contact-inquiries"] })
    },
  })

  const inquiries = data?.data ?? []
  const meta = data?.meta ?? {}

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.contactInquiries", "Contact Inquiries")}</h1>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.contactInquiries", "Contact Inquiries")}</h1>
          <p className="text-muted-foreground text-sm">{t("admin.contactInquiriesDesc", "Inquiries from contact form")}</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("admin.taskStatus", "Status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {INQUIRY_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("admin.name")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("auth.email")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("admin.inquiryType", "Type")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("admin.phone")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("admin.message", "Message")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("admin.status")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{t("admin.date", "Date")}</th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {inquiries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      {t("analytics.noData", "No data")}
                    </td>
                  </tr>
                ) : (
                  inquiries.map((inq) => (
                    <tr key={inq.id} className="border-b hover:bg-muted/30">
                      <TableCell>{inq.name}</TableCell>
                      <TableCell>{inq.email}</TableCell>
                      <TableCell>{inq.inquiry_type || "—"}</TableCell>
                      <TableCell>{inq.phone || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{inq.message}</TableCell>
                      <TableCell>
                        <Badge variant={inq.status === "new" ? "default" : "secondary"}>
                          {inq.status?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(inq.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setEditingInquiry(inq)}>
                          <Pencil className="size-4" />
                        </Button>
                      </TableCell>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {meta.last_page > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {t("admin.pageOf", { current: meta.current_page ?? 1, total: meta.last_page ?? 1 })}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="size-4 rtl:rotate-180" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(meta.last_page ?? 1, p + 1))} disabled={page >= (meta.last_page ?? 1)}>
                  <ChevronRight className="size-4 rtl:rotate-180" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {editingInquiry && (
        <InquiryEditDialog
          inquiry={editingInquiry}
          assignees={assignees}
          onClose={() => setEditingInquiry(null)}
          onSave={(payload) => updateMutation.mutate({ id: editingInquiry.id, payload })}
          isPending={updateMutation.isPending}
          t={t}
        />
      )}
    </div>
  )
}

function TableCell({ children, className = "" }) {
  return <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>
}

function InquiryEditDialog({ inquiry, assignees, onClose, onSave, isPending, t }) {
  const [status, setStatus] = useState(inquiry?.status ?? "new")
  const [assignedTo, setAssignedTo] = useState(
    (inquiry?.assigned_to ?? inquiry?.assignedTo?.id) ? String(inquiry.assigned_to ?? inquiry.assignedTo?.id) : "none"
  )
  const [adminNotes, setAdminNotes] = useState(inquiry?.admin_notes ?? "")

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("admin.editInquiry", "Edit inquiry")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("admin.name")}</p>
            <p>{inquiry.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("auth.email")}</p>
            <p>{inquiry.email}</p>
          </div>
          {inquiry.inquiry_type ? (
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("admin.inquiryType", "Type")}</p>
              <p>{inquiry.inquiry_type}</p>
            </div>
          ) : null}
          {inquiry.subject ? (
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("admin.subject", "Subject")}</p>
              <p>{inquiry.subject}</p>
            </div>
          ) : null}
          {(inquiry.form_data?.attachments ?? []).length > 0 ? (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">{t("admin.attachments", "Attachments")}</p>
              <ul className="space-y-1 text-sm">
                {inquiry.form_data.attachments.map((file, i) => (
                  <li key={i}>
                    <a href={file.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {file.name || file.path}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("admin.message", "Message")}</p>
            <p className="rounded border bg-muted/30 p-3 text-sm">{inquiry.message}</p>
          </div>
          <div>
            <Label>{t("admin.status")}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INQUIRY_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("admin.assignee")}</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {assignees.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("admin.adminNotes", "Admin notes")}</Label>
            <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="mt-1" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            onClick={() => onSave({
              status,
              assigned_to: assignedTo === "none" ? null : Number(assignedTo),
              admin_notes: adminNotes || null,
            })}
            disabled={isPending}
          >
            {isPending && <Loader2 className="me-2 size-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
