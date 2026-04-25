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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import apiClient from "@/lib/apiClient"
import { Plus, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { usePermission } from "@/hooks/usePermission"
import { format } from "date-fns"
import { ar, enUS } from "date-fns/locale"
import { cn } from "@/lib/utils"

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
  const canViewTasks = usePermission("tasks.view")
  const canCreateTasks = usePermission("tasks.create")
  const canAssignTasks = usePermission("tasks.assign")
  const canUpdateTasks = usePermission("tasks.update")
  const canCloseTasks = usePermission("tasks.close")
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
    enabled: canViewTasks,
  })

  const { data: assigneesData } = useQuery({
    queryKey: ["admin", "tasks", "assignees"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/admin/tasks/assignees")
      return res?.data ?? []
    },
    enabled: canAssignTasks,
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

  if (!canViewTasks) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.tasks")}</h1>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {t("admin.tasksPermissionDenied")}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.tasks")}</h1>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("admin.tasks")}</h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("admin.taskStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{t(`admin.taskStatusValue.${s}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("admin.taskType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {TASK_TYPES.map((ty) => (
                <SelectItem key={ty.value} value={ty.value}>{t(ty.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canCreateTasks ? (
            <Button onClick={() => setOpenCreate(true)}>
            <Plus className="me-2 size-4" />
            {t("admin.addTask")}
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.tasks")}</CardTitle>
          <p className="text-sm text-muted-foreground">{tasks.length} {t("admin.tasks").toLowerCase()}</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.taskTitle")}</TableHead>
                <TableHead>{t("admin.taskType")}</TableHead>
                <TableHead>{t("admin.taskStatus")}</TableHead>
                <TableHead>{t("admin.priority")}</TableHead>
                <TableHead>{t("admin.taskCreatedBy")}</TableHead>
                <TableHead>{t("admin.assignee")}</TableHead>
                <TableHead>{t("admin.dueDate")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(`admin.taskTypeValue.${task.type ?? "admin"}`)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={task.status === "done" ? "secondary" : "default"}>
                      {t(`admin.taskStatusValue.${task.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(`admin.taskPriorityValue.${task.priority ?? "medium"}`)}</Badge>
                  </TableCell>
                  <TableCell>
                    {task.creator?.name || "-"}
                  </TableCell>
                  <TableCell>
                    {task.assignee ? (
                      <div className="leading-tight">
                        <div>{task.assignee.name}</div>
                        <div className="text-xs text-muted-foreground">{task.assignee.email}</div>
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {task.due_at ? new Date(task.due_at).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {canUpdateTasks || canAssignTasks ? (
                        <Button variant="ghost" size="icon" onClick={() => setEditingTask(task)}>
                          <Pencil className="size-4" />
                        </Button>
                      ) : null}
                      {canUpdateTasks && task.status === "todo" ? (
                        <Button variant="ghost" size="sm" onClick={() => updateMutation.mutate({ id: task.id, payload: { status: "in_progress" } })}>
                          {t("admin.taskActionStart")}
                        </Button>
                      ) : null}
                      {canCloseTasks && task.status !== "done" ? (
                        <Button variant="ghost" size="sm" onClick={() => updateMutation.mutate({ id: task.id, payload: { status: "done" } })}>
                          {t("admin.taskActionComplete")}
                        </Button>
                      ) : null}
                      {canCloseTasks && task.status === "done" ? (
                        <Button variant="ghost" size="sm" onClick={() => updateMutation.mutate({ id: task.id, payload: { status: "todo" } })}>
                          {t("admin.taskActionReopen")}
                        </Button>
                      ) : null}
                      {canCloseTasks ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(task.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
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

      {openCreate && canCreateTasks && (
        <Dialog open onOpenChange={(o) => !o && setOpenCreate(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.addTask")}</DialogTitle>
            </DialogHeader>
            <TaskForm
              assignees={assignees}
              canAssignTasks={canAssignTasks}
              canUpdateTasks={canUpdateTasks}
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
              <DialogTitle>{t("admin.editTask")}</DialogTitle>
            </DialogHeader>
            <TaskForm
              task={editingTask}
              assignees={assignees}
              canAssignTasks={canAssignTasks}
              canUpdateTasks={canUpdateTasks}
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

function TaskForm({ task, assignees, canAssignTasks, canUpdateTasks, onClose, onSubmit, isPending }) {
  const { t } = useTranslation()
  const { i18n } = useTranslation()
  const [title, setTitle] = useState(task?.title ?? "")
  const [description, setDescription] = useState(task?.description ?? "")
  const [type, setType] = useState(task?.type ?? "admin")
  const [status, setStatus] = useState(task?.status ?? "todo")
  const [priority, setPriority] = useState(task?.priority ?? "medium")
  const [assigneeId, setAssigneeId] = useState(
    task?.assignee_id ? String(task.assignee_id) : (assignees[0] ? String(assignees[0].id) : "")
  )
  const [dueAt, setDueAt] = useState(task?.due_at ? new Date(task.due_at) : null)
  const [dueOpen, setDueOpen] = useState(false)
  const locale = i18n.language?.startsWith("ar") ? ar : enUS

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          title,
          description: description || null,
          type,
          ...(canUpdateTasks ? { status } : {}),
          priority,
          ...(canAssignTasks && assigneeId ? { assignee_id: Number(assigneeId) } : {}),
          due_at: dueAt ? dueAt.toISOString() : null,
        })
      }}
      className="space-y-4"
    >
      <div>
        <Label>{t("admin.taskTitle")}</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" required />
      </div>
      <div>
        <Label>{t("admin.taskDescription")}</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={3} />
      </div>
      <div>
        <Label>{t("admin.taskType")}</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_TYPES.map((ty) => (
              <SelectItem key={ty.value} value={ty.value}>{t(ty.labelKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t("admin.taskStatus")}</Label>
          <Select value={status} onValueChange={setStatus} disabled={!canUpdateTasks}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{t(`admin.taskStatusValue.${s}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("admin.priority")}</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>{t(`admin.taskPriorityValue.${p}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t("admin.assignee")}</Label>
          <Select value={assigneeId} onValueChange={setAssigneeId} disabled={!canAssignTasks || assignees.length === 0}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
                <SelectContent>
                  {assignees.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name} - {a.email}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("admin.dueDate")}</Label>
          <Popover open={dueOpen} onOpenChange={setDueOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn("mt-1 w-full justify-start text-left font-normal", !dueAt && "text-muted-foreground")}
              >
                <CalendarIcon className="me-2 size-4 opacity-60" />
                {dueAt ? format(dueAt, "PPP", { locale }) : t("admin.pickDueDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueAt ?? undefined}
                onSelect={(d) => {
                  setDueAt(d ?? null)
                  if (d) setDueOpen(false)
                }}
              />
              <div className="border-t p-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setDueAt(null)}>
                  {t("common.clear")}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.save")}
        </Button>
      </DialogFooter>
    </form>
  )
}
