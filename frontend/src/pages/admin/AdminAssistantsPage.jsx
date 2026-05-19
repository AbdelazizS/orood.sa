import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import * as authService from "@/services/authService"
import { passwordMatchesPolicy } from "@/lib/passwordPolicy"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTable } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { usePermission } from "@/hooks/usePermission"
import { Loader2, MoreHorizontal, Plus, KeyRound, Pencil, Trash2, UserCog } from "lucide-react"

const EMPTY_FORM = {
  full_name: "",
  email: "",
  password: "",
  phone: "",
  job_role: "support_agent",
  assigned_user_types: ["individual"],
  status: "active",
}

function fetchAssistants() {
  return apiClient.get("/admin/assistants").then((r) => r.data)
}

function fetchMeta() {
  return apiClient.get("/admin/assistants/meta").then((r) => r.data?.data ?? r.data)
}

export function AdminAssistantsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canManage = usePermission("assistants.manage")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [generatedPassword, setGeneratedPassword] = useState(null)

  const { data: meta } = useQuery({
    queryKey: ["admin", "assistants", "meta"],
    queryFn: fetchMeta,
    enabled: canManage,
  })

  const { data: passwordPolicy } = useQuery({
    queryKey: ["auth", "password-policy"],
    queryFn: authService.getPasswordPolicy,
    staleTime: 0,
    enabled: dialogOpen,
  })

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "assistants"],
    queryFn: fetchAssistants,
    enabled: canManage,
  })

  const rows = data?.data ?? []

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editing?.id) {
        return apiClient.put(`/admin/assistants/${editing.id}`, payload)
      }
      return apiClient.post("/admin/assistants", payload)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "assistants"] })
      const temp = res.data?.meta?.temporary_password
      if (temp) {
        setGeneratedPassword(temp)
        toast.success(t("admin.assistants.createdWithPassword"))
      } else {
        toast.success(editing ? t("admin.assistants.updated") : t("admin.assistants.created"))
        closeDialog()
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.errorGeneric"))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/assistants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "assistants"] })
      toast.success(t("admin.assistants.deleted"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.errorGeneric")),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/admin/assistants/${id}/reset-password`),
    onSuccess: (res) => {
      const temp = res.data?.meta?.temporary_password
      if (temp) {
        navigator.clipboard?.writeText(temp).catch(() => {})
        toast.success(t("admin.assistants.passwordReset", { password: temp }))
      }
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.errorGeneric")),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => apiClient.put(`/admin/assistants/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "assistants"] })
      toast.success(t("admin.assistants.statusUpdated"))
    },
  })

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setGeneratedPassword(null)
    setDialogOpen(true)
  }

  function openEdit(row) {
    setEditing(row)
    setGeneratedPassword(null)
    setForm({
      full_name: row.full_name ?? "",
      email: row.email ?? "",
      password: "",
      phone: row.phone ?? "",
      job_role: row.job_role ?? "support_agent",
      assigned_user_types: row.assigned_user_types ?? [],
      status: row.status ?? "active",
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditing(null)
    setGeneratedPassword(null)
    setForm(EMPTY_FORM)
  }

  function toggleUserType(type) {
    setForm((prev) => {
      const set = new Set(prev.assigned_user_types)
      if (set.has(type)) set.delete(type)
      else set.add(type)
      return { ...prev, assigned_user_types: [...set] }
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const pwd = form.password.trim()
    if (!editing && pwd && !passwordMatchesPolicy(pwd, passwordPolicy)) {
      toast.error(passwordPolicy?.hint || t("auth.passwordWeak", "Password does not meet policy"))
      return
    }
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      job_role: form.job_role,
      assigned_user_types: form.assigned_user_types,
      status: form.status,
    }
    if (!editing && pwd) {
      payload.password = pwd
    }
    saveMutation.mutate(payload)
  }

  const jobRoles = meta?.job_roles ?? []
  const userTypes = meta?.user_types ?? []

  const columns = [
    { id: "name", header: t("admin.name"), cell: ({ row }) => row.original.full_name },
    { id: "email", header: t("auth.email"), cell: ({ row }) => row.original.email },
    {
      id: "role",
      header: t("admin.assistants.jobRole"),
      cell: ({ row }) => (
        <Badge variant="secondary">{t(`admin.assistants.roles.${row.original.job_role}`, row.original.job_role)}</Badge>
      ),
    },
    {
      id: "types",
      header: t("admin.assistants.assignedTypes"),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.assigned_user_types ?? []).map((type) => (
            <Badge key={type} variant="outline" className="text-[10px]">
              {t(`admin.assistants.userTypes.${type}`, type)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "status",
      header: t("admin.assistants.status"),
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "default" : "destructive"}>
          {row.original.status === "active" ? t("admin.assistants.active") : t("admin.assistants.inactive")}
        </Badge>
      ),
    },
    {
      id: "created",
      header: t("admin.assistants.createdAt"),
      cell: ({ row }) =>
        row.original.created_at ? new Date(row.original.created_at).toLocaleString() : "—",
    },
    {
      id: "actions",
      header: t("admin.actions"),
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row.original)}>
              <Pencil className="me-2 size-4" />
              {t("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toggleStatusMutation.mutate({
                  id: row.original.id,
                  status: row.original.status === "active" ? "inactive" : "active",
                })
              }
            >
              <UserCog className="me-2 size-4" />
              {row.original.status === "active"
                ? t("admin.assistants.suspend")
                : t("admin.assistants.activate")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => resetPasswordMutation.mutate(row.original.id)}>
              <KeyRound className="me-2 size-4" />
              {t("admin.assistants.resetPassword")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                if (window.confirm(t("admin.assistants.deleteConfirm"))) {
                  deleteMutation.mutate(row.original.id)
                }
              }}
            >
              <Trash2 className="me-2 size-4" />
              {t("common.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  if (!canManage) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          {t("admin.assistants.noAccess")}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.assistants.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin.assistants.subtitle")}</p>
        </div>
        <Button type="button" onClick={openCreate} className="gap-2">
          <Plus className="size-4" />
          {t("admin.assistants.create")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("admin.assistants.listTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <DataTable columns={columns} data={rows} />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("admin.assistants.editTitle") : t("admin.assistants.createTitle")}
            </DialogTitle>
          </DialogHeader>
          {generatedPassword ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">{t("admin.assistants.passwordHint")}</p>
              <Input readOnly value={generatedPassword} className="font-mono" />
              <DialogFooter>
                <Button type="button" onClick={closeDialog}>
                  {t("common.close")}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t("admin.assistants.fullName")}</Label>
                <Input
                  id="full_name"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              {!editing ? (
                <div className="space-y-2">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <PasswordInput
                    id="password"
                    autoComplete="new-password"
                    placeholder={t("admin.assistants.passwordOptional")}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="phone">{t("admin.phone")}</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.assistants.jobRole")}</Label>
                <Select
                  value={form.job_role}
                  onValueChange={(v) => setForm((f) => ({ ...f, job_role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {jobRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {t(`admin.assistants.roles.${role}`, role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t("admin.assistants.assignedTypes")}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {userTypes.map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.assigned_user_types.includes(type)}
                        onCheckedChange={() => toggleUserType(type)}
                      />
                      {t(`admin.assistants.userTypes.${type}`, type)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="space-y-2">
                <Label>{t("admin.assistants.status")}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("admin.assistants.active")}</SelectItem>
                    <SelectItem value="inactive">{t("admin.assistants.inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={saveMutation.isPending || form.assigned_user_types.length === 0}>
                  {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {editing ? t("common.save") : t("admin.assistants.create")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
