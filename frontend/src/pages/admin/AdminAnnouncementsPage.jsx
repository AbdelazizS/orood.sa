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
import { Plus, Pencil, Trash2, Loader2, Megaphone } from "lucide-react"

const TYPES = ["info", "warning", "alert"]
const TARGETS = ["all", "individuals", "companies", "team"]

export function AdminAnnouncementsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [openCreate, setOpenCreate] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/admin/announcements")
      return res ?? {}
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/admin/announcements", payload),
    onSuccess: () => {
      setOpenCreate(false)
      queryClient.refetchQueries({ queryKey: ["admin", "announcements"] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.put(`/admin/announcements/${id}`, payload),
    onSuccess: () => {
      setEditing(null)
      queryClient.refetchQueries({ queryKey: ["admin", "announcements"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/announcements/${id}`),
    onSuccess: () => {
      setEditing(null)
      queryClient.refetchQueries({ queryKey: ["admin", "announcements"] })
    },
  })

  const announcements = data?.data ?? []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.announcements", "Announcements")}</h1>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.announcements", "Announcements")}</h1>
          <p className="text-muted-foreground text-sm">{t("admin.announcementsDesc", "Banner at top of offers and wholesale")}</p>
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          <Plus className="me-2 size-4" />
          {t("admin.addAnnouncement", "Add announcement")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <Megaphone className="size-12 opacity-50" />
                <p>{t("analytics.noData", "No data")}</p>
              </div>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-muted-foreground text-sm line-clamp-1">{a.message}</p>
                    <div className="mt-1 flex gap-2">
                      <Badge variant="outline">{a.type}</Badge>
                      <Badge variant="secondary">{a.target}</Badge>
                      {!a.active && <Badge variant="destructive">{t("admin.inactive", "Inactive")}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(a)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(a.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {openCreate && (
        <AnnouncementForm
          onClose={() => setOpenCreate(false)}
          onSubmit={(p) => createMutation.mutate(p)}
          isPending={createMutation.isPending}
          t={t}
        />
      )}

      {editing && (
        <AnnouncementForm
          announcement={editing}
          onClose={() => setEditing(null)}
          onSubmit={(p) => updateMutation.mutate({ id: editing.id, payload: p })}
          isPending={updateMutation.isPending}
          t={t}
        />
      )}
    </div>
  )
}

function AnnouncementForm({ announcement, onClose, onSubmit, isPending, t }) {
  const [title, setTitle] = useState(announcement?.title ?? "")
  const [message, setMessage] = useState(announcement?.message ?? "")
  const [type, setType] = useState(announcement?.type ?? "info")
  const [target, setTarget] = useState(announcement?.target ?? "all")
  const [active, setActive] = useState(announcement?.active ?? true)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{announcement ? t("admin.editAnnouncement", "Edit announcement") : t("admin.addAnnouncement", "Add announcement")}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit({ title, message, type, target, active })
          }}
          className="space-y-4"
        >
          <div>
            <Label>{t("admin.taskTitle", "Title")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label>{t("admin.message", "Message")}</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("admin.type", "Type")}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((ty) => (
                    <SelectItem key={ty} value={ty}>{ty}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("admin.target", "Target")}</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGETS.map((tg) => (
                    <SelectItem key={tg} value={tg}>{tg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <Label htmlFor="active">{t("admin.active", "Active")}</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="me-2 size-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
