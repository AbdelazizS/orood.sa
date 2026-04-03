import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { Plus, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react"

const STATUSES = ["todo", "in_progress", "done"]
const PRIORITIES = ["low", "medium", "high"]
const TASK_TYPES = [
  { value: "admin", labelKey: "admin.taskTypeAdmin" },
  { value: "team", labelKey: "admin.taskTypeTeam" },
  { value: "inquiry", labelKey: "admin.taskTypeInquiry" },
]

export function AdminTasksPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [editingTask, setEditingTask] = useState(null)
  const [openCreate, setOpenCreate] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "tasks", statusFilter, typeFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (typeFilter !== "all") params.set("type", typeFilter)
      params.set("page", String(page))
      const { data: res } = await apiClient.get(`/admin/tasks?${params}`)
      return res ?? {}
    },
  })

  const { data: assigneesData } = useQuery({
    queryKey: ["admin", "tasks", "assignees"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/admin/tasks/assignees")
      return res?.data ?? []
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/admin/tasks", payload),
    onSuccess: () => {
      setOpenCreate(false)
      queryClient.refetchQueries({ queryKey: ["admin", "tasks"] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.put(`/admin/tasks/${id}`, payload),
    onSuccess: () => {
      setEditingTask(null)
      queryClient.refetchQueries({ queryKey: ["admin", "tasks"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/tasks/${id}`),
    onSuccess: () => {
      setEditingTask(null)
      queryClient.refetchQueries({ queryKey: ["admin", "tasks"] })
    },
  })

  const tasks = data?.data ?? []
  const meta = data?.meta ?? {}
  const assignees = assigneesData ?? []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.tasks", "Tasks")}</h1>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("admin.tasks", "Tasks")}</h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("admin.taskStatus", "Status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("admin.taskType", "Type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {TASK_TYPES.map((ty) => (
                <SelectItem key={ty.value} value={ty.value}>{t(ty.labelKey, ty.value)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="me-2 size-4" />
            {t("admin.addTask", "Add Task")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.tasks", "Tasks")}</CardTitle>
          <p className="text-sm text-muted-foreground">{tasks.length} {t("admin.tasks", "Tasks").toLowerCase()}</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.taskTitle", "Title")}</TableHead>
                <TableHead>{t("admin.taskType", "Type")}</TableHead>
                <TableHead>{t("admin.taskStatus", "Status")}</TableHead>
                <TableHead>{t("admin.priority", "Priority")}</TableHead>
                <TableHead>{t("admin.assignee", "Assignee")}</TableHead>
                <TableHead>{t("admin.dueDate", "Due")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{task.type ?? "admin"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={task.status === "done" ? "secondary" : "default"}>
                      {task.status?.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{task.priority ?? "medium"}</Badge>
                  </TableCell>
                  <TableCell>
                    {task.assignee ? (
                      <span>{task.assignee.name} <Badge variant="outline" className="text-xs">{t(`admin.role.${task.assignee.role}`, task.assignee.role?.replace(/_/g, " ") ?? "")}</Badge></span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {task.due_at ? new Date(task.due_at).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditingTask(task)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(task.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

      {openCreate && (
        <Dialog open onOpenChange={(o) => !o && setOpenCreate(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.addTask", "Add Task")}</DialogTitle>
            </DialogHeader>
            <TaskForm
              assignees={assignees}
              onClose={() => setOpenCreate(false)}
              onSubmit={(payload) => createMutation.mutate(payload)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {editingTask && (
        <Dialog open onOpenChange={(o) => !o && setEditingTask(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.editTask", "Edit Task")}</DialogTitle>
            </DialogHeader>
            <TaskForm
              task={editingTask}
              assignees={assignees}
              onClose={() => setEditingTask(null)}
              onSubmit={(payload) => updateMutation.mutate({ id: editingTask.id, payload })}
              isPending={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function TaskForm({ task, assignees, onClose, onSubmit, isPending }) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(task?.title ?? "")
  const [description, setDescription] = useState(task?.description ?? "")
  const [type, setType] = useState(task?.type ?? "admin")
  const [status, setStatus] = useState(task?.status ?? "todo")
  const [priority, setPriority] = useState(task?.priority ?? "medium")
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ? String(task.assignee_id) : "all")
  const [dueAt, setDueAt] = useState(task?.due_at ? task.due_at.slice(0, 10) : "")

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          title,
          description: description || null,
          type,
          status,
          priority,
          assignee_id: assigneeId === "all" ? null : Number(assigneeId),
          due_at: dueAt || null,
        })
      }}
      className="space-y-4"
    >
      <div>
        <Label>{t("admin.taskTitle", "Title")}</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" required />
      </div>
      <div>
        <Label>{t("admin.taskDescription", "Description")}</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={3} />
      </div>
      <div>
        <Label>{t("admin.taskType", "Type")}</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_TYPES.map((ty) => (
              <SelectItem key={ty.value} value={ty.value}>{t(ty.labelKey, ty.value)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t("admin.taskStatus", "Status")}</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("admin.priority", "Priority")}</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t("admin.assignee", "Assignee")}</Label>
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {assignees.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name} {a.role ? `(${t(`admin.role.${a.role}`, a.role.replace(/_/g, " "))})` : ""}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("admin.dueDate", "Due")}</Label>
          <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="mt-1" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel", "Cancel")}</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.save", "Save")}
        </Button>
      </DialogFooter>
    </form>
  )
}
