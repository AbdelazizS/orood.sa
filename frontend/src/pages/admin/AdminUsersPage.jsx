import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/ui/data-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Label } from "@/components/ui/label"
import apiClient from "@/lib/apiClient"
import { MoreHorizontal, Pencil, Loader2, Ban, UserX, Search, ShieldCheck, Wallet, Check, Eye, UserPlus } from "lucide-react"
import { VerificationBadge } from "@/components/auth/VerificationBadge"
import { useAuthStore } from "@/store/useAuthStore"
import { PasswordInput } from "@/components/ui/password-input"
import { usePermission } from "@/hooks/usePermission"
import * as authService from "@/services/authService"
import { isAroothComEmail, passwordMatchesPolicy } from "@/lib/passwordPolicy"

const ROLES = ["super_admin", "admin", "manager", "employee", "marketer", "company", "seller", "buyer", "user"]
const STAFF_CREATE_ROLES = ["super_admin", "admin", "manager", "employee"]
const VERIFICATION_LEVELS = [
  { value: "unverified", labelKey: "verification.unverified", color: "grey" },
  { value: "email", labelKey: "verification.emailVerified", color: "green" },
  { value: "id_verified", labelKey: "verification.idVerified", color: "gold" },
  { value: "company_verified", labelKey: "verification.companyVerified", color: "blue" },
]

const MEMBER_FILTERS = [
  { value: "all", labelKey: "common.all" },
  { value: "new", labelKey: "admin.membersNew" },
  { value: "cancelled", labelKey: "admin.membersCancelled" },
  { value: "inactive_1w", labelKey: "admin.membersInactive1w" },
  { value: "inactive_1m", labelKey: "admin.membersInactive1m" },
  { value: "inactive_3m", labelKey: "admin.membersInactive3m" },
]

function userColumns({ t, i18n, setEditingUser, setVerifyUser, modMutation, navigate, currentUserId }) {
  return [
    { id: "name", header: t("admin.name"), cell: ({ row }) => row.original.name },
    { id: "email", header: t("auth.email"), cell: ({ row }) => row.original.email },
    { id: "phone", header: t("admin.phone"), cell: ({ row }) => row.original.phone || "—" },
    {
      id: "registered_at",
      header: t("admin.registeredAt", "تاريخ التسجيل"),
      cell: ({ row }) => {
        const raw = row.original.created_at
        if (!raw) return "—"
        try {
          return new Date(raw).toLocaleString(i18n.language?.startsWith("en") ? "en-SA" : "ar-SA", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        } catch {
          return String(raw)
        }
      },
    },
    {
      id: "role",
      header: t("auth.role"),
      cell: ({ row }) => (
        <Badge variant={["admin", "super_admin", "manager", "employee", "marketer", "company"].includes(row.original.role) ? "default" : "secondary"}>
          {t(`admin.role.${row.original.role}`, row.original.role?.replace(/_/g, " "))}
        </Badge>
      ),
    },
    {
      id: "city",
      header: t("addOffer.cityLabel"),
      cell: ({ row }) => {
        const city = row.original.city
        return city ? (i18n.language?.startsWith("ar") && city.name_ar ? city.name_ar : city.name) : "—"
      },
    },
    {
      id: "verification",
      header: t("admin.verificationBadge"),
      cell: ({ row }) => (
        <VerificationBadge level={row.original.verification_level} size="sm" />
      ),
    },
    {
      id: "guarantee",
      header: t("guarantee.title"),
      cell: ({ row }) => {
        const amt = row.original.financial_guarantee ?? 0
        const hasGuarantee = amt > 0
        return (
          <div className="flex items-center gap-2">
            {hasGuarantee ? (
              <>
                <Check className="size-4 text-green-600" />
                <span>{Number(amt).toLocaleString()} {t("common.currency")}</span>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        )
      },
    },
    {
      id: "status",
      header: t("admin.status"),
      cell: ({ row }) => {
        const u = row.original
        return (
          <div className="flex gap-1">
            {u.banned_at && <Badge variant="destructive">{t("admin.banned")}</Badge>}
            {u.suspended_at && !u.banned_at && <Badge variant="secondary">{t("admin.suspended")}</Badge>}
            {!u.banned_at && !u.suspended_at && (
              <Badge variant="outline" className="text-green-600 border-green-600">{t("admin.active")}</Badge>
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const user = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/admin/users/${user.id}`)}>
                <Eye className="me-2 size-4" />
                {t("admin.viewProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditingUser(user)}>
                <Pencil className="me-2 size-4" />
                {t("admin.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setVerifyUser(user)}>
                <ShieldCheck className="me-2 size-4" />
                {t("admin.setVerification")}
              </DropdownMenuItem>
              {user.role !== "super_admin" && Number(user.id) !== Number(currentUserId) && (
                <>
                  {user.banned_at ? (
                    <DropdownMenuItem onClick={() => modMutation.mutate({ id: user.id, action: "unban" })}>
                      <Ban className="me-2 size-4" />
                      {t("admin.unban")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => modMutation.mutate({ id: user.id, action: "ban" })}>
                      <Ban className="me-2 size-4" />
                      {t("admin.ban")}
                    </DropdownMenuItem>
                  )}
                  {user.suspended_at ? (
                    <DropdownMenuItem onClick={() => modMutation.mutate({ id: user.id, action: "unsuspend" })}>
                      <UserX className="me-2 size-4" />
                      {t("admin.unsuspend")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => modMutation.mutate({ id: user.id, action: "suspend" })}>
                      <UserX className="me-2 size-4" />
                      {t("admin.suspend")}
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {(user.financial_guarantee ?? 0) > 0 && (
                <DropdownMenuItem onClick={() => modMutation.mutate({ id: user.id, action: "refund-guarantee" })}>
                  <Wallet className="me-2 size-4" />
                  {t("admin.refundGuarantee")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

export function AdminUsersPage() {
  const { t, i18n } = useTranslation()
  const currentUserId = useAuthStore((s) => s.user?.id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editingUser, setEditingUser] = useState(null)
  const [verifyUser, setVerifyUser] = useState(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [memberFilter, setMemberFilter] = useState("")
  const [cityFilter, setCityFilter] = useState("")
  const [verificationFilter, setVerificationFilter] = useState("")
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const canCreateStaff = usePermission("users.assign_roles")

  const { data: passwordPolicy } = useQuery({
    queryKey: ["auth", "password-policy"],
    queryFn: authService.getPasswordPolicy,
    staleTime: 0,
    enabled: createOpen,
  })

  useEffect(() => {
    setPage(1)
  }, [search, roleFilter, memberFilter, cityFilter, verificationFilter])

  const { data: regionsData } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data } = await apiClient.get("/regions")
      return data?.data ?? data ?? []
    },
  })

  const regions = Array.isArray(regionsData) ? regionsData : regionsData?.data ?? []
  const cities = regions.flatMap((r) => (r.cities ?? []).map((c) => ({ ...c, region_name: r.name })))

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", search, roleFilter, memberFilter, cityFilter, verificationFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (roleFilter) params.set("role", roleFilter)
      if (memberFilter) params.set("member_filter", memberFilter)
      if (cityFilter) params.set("city_id", cityFilter)
      if (verificationFilter) params.set("verification_level", verificationFilter)
      params.set("page", String(page))
      const { data: res } = await apiClient.get(`/admin/users?${params}`)
      return res ?? {}
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/admin/users", payload),
    onSuccess: () => {
      setCreateOpen(false)
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast.success(t("admin.staff.created"))
    },
    onError: (err) => {
      const validationErrors = err?.response?.data?.errors
      const firstValidationMessage = validationErrors
        ? Object.values(validationErrors)?.flat?.()?.[0]
        : null
      toast.error(firstValidationMessage || err?.response?.data?.message || t("common.error"))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.put(`/admin/users/${id}`, payload),
    onSuccess: () => {
      setEditingUser(null)
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast.success(t("admin.updateSuccess"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const modMutation = useMutation({
    mutationFn: ({ id, action, payload }) => {
      if (action === "verify") {
        return apiClient.post(`/admin/users/${id}/verify`, payload)
      }
      return apiClient.post(`/admin/users/${id}/${action}`)
    },
    onSuccess: (_, variables) => {
      setVerifyUser(null)
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      if (variables.action === "verify") toast.success(t("admin.verificationUpdated"))
      else if (variables.action === "refund-guarantee") toast.success(t("guarantee.refunded"))
      else if (variables.action === "ban") toast.success(t("admin.userBanned"))
      else if (variables.action === "unban") toast.success(t("admin.userUnbanned"))
      else if (variables.action === "suspend") toast.success(t("admin.userSuspended"))
      else if (variables.action === "unsuspend") toast.success(t("admin.userUnsuspended"))
    },
    onError: (err) => {
      const backendMessage = err?.response?.data?.message
      const validationErrors = err?.response?.data?.errors
      const firstValidationMessage = validationErrors
        ? Object.values(validationErrors)?.flat?.()?.[0]
        : null
      toast.error(firstValidationMessage || backendMessage || t("common.error"))
    },
  })

  const users = data?.data ?? []
  const meta = data?.meta ?? {}
  const total = meta.total ?? 0

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.usersTitle")}</h1>
        <Skeleton className="h-64" />
      </div>
    )
  }

  const columns = userColumns({ t, i18n, setEditingUser, setVerifyUser, modMutation, navigate, currentUserId })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.usersTitle")}</h1>
          <p className="text-muted-foreground">{t("admin.usersDescription")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute start-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t("admin.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-8 w-48"
            />
          </div>
          <Select value={roleFilter || "all"} onValueChange={(v) => setRoleFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t("admin.roleLabel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>{t(`admin.role.${r}`, r.replace(/_/g, " "))}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cityFilter || "all"} onValueChange={(v) => setCityFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("addOffer.cityLabel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
          <Select value={verificationFilter || "all"} onValueChange={(v) => setVerificationFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("admin.verificationBadge")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {VERIFICATION_LEVELS.map((v) => (
                <SelectItem key={v.value} value={v.value}>{t(v.labelKey, v.value.replace(/_/g, " "))}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={memberFilter || "all"} onValueChange={(v) => setMemberFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("admin.memberFilter")} />
            </SelectTrigger>
            <SelectContent>
              {MEMBER_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{t(f.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canCreateStaff ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <UserPlus className="me-2 size-4" />
              {t("admin.staff.create")}
            </Button>
          ) : null}
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={users}
            pagination
            manualPagination
            pageCount={meta.last_page ?? 1}
            pageIndex={page - 1}
            onPageChange={(idx) => setPage(idx + 1)}
            total={total}
          />
        </CardContent>
      </Card>

      {editingUser && (
        <Dialog open onOpenChange={(o) => !o && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.editUser")}</DialogTitle>
            </DialogHeader>
            <EditUserForm
              user={editingUser}
              cities={cities}
              i18n={i18n}
              onClose={() => setEditingUser(null)}
              onSave={(payload) => updateMutation.mutate({ id: editingUser.id, payload })}
              isPending={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {verifyUser && (
        <VerifyUserDialog
          user={verifyUser}
          onClose={() => setVerifyUser(null)}
          onSave={(payload) => modMutation.mutate({ id: verifyUser.id, action: "verify", payload })}
          isPending={modMutation.isPending}
        />
      )}

      {createOpen ? (
        <CreateStaffDialog
          passwordPolicy={passwordPolicy}
          onClose={() => setCreateOpen(false)}
          onSave={(payload) => createMutation.mutate(payload)}
          isPending={createMutation.isPending}
        />
      ) : null}
    </div>
  )
}

function CreateStaffDialog({ passwordPolicy, onClose, onSave, isPending }) {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState("admin")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [localError, setLocalError] = useState("")

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("admin.staff.createTitle")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setLocalError("")
            if (!isAroothComEmail(email)) {
              setLocalError(t("auth.validation.aroothComEmail", "Staff email must use @arooth.com"))
              return
            }
            if (password !== confirmPassword) {
              setLocalError(t("auth.passwordMismatch", "Passwords do not match"))
              return
            }
            if (!passwordMatchesPolicy(password, passwordPolicy)) {
              setLocalError(passwordPolicy?.hint || t("auth.passwordWeak", "Password does not meet policy"))
              return
            }
            onSave({
              name,
              email: email.trim().toLowerCase(),
              phone: phone || undefined,
              role,
              password,
              password_confirmation: confirmPassword,
            })
          }}
        >
          <p className="text-sm text-muted-foreground">{t("admin.staff.emailHint")}</p>
          {localError ? <p className="text-sm text-destructive">{localError}</p> : null}
          <div>
            <Label>{t("admin.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" required />
          </div>
          <div>
            <Label>{t("auth.email")}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              placeholder="name@arooth.com"
              required
            />
          </div>
          <div>
            <Label>{t("admin.phone")}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>{t("admin.roleLabel")}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_CREATE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`admin.role.${r}`, r.replace(/_/g, " "))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("auth.password")}</Label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <Label>{t("auth.confirmPassword")}</Label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1"
              autoComplete="new-password"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : t("admin.staff.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function VerifyUserDialog({ user, onClose, onSave, isPending }) {
  const { t } = useTranslation()
  const [level, setLevel] = useState(user?.verification_level ?? "unverified")
  useEffect(() => {
    if (user) setLevel(user.verification_level ?? "unverified")
  }, [user?.id, user?.verification_level])
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.setVerification")}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSave({ verification_level: level })
          }}
          className="space-y-4"
        >
          <div>
            <Label>{t("admin.verificationLevel")}</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VERIFICATION_LEVELS.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {t(v.labelKey, v.value.replace(/_/g, " "))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditUserForm({ user, cities, i18n, onClose, onSave, isPending }) {
  const { t } = useTranslation()
  const [name, setName] = useState(user?.name ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [role, setRole] = useState(user?.role ?? "user")
  const [cityId, setCityId] = useState(user?.city_id ? String(user.city_id) : "none")
  useEffect(() => {
    if (user) {
      setName(user.name ?? "")
      setEmail(user.email ?? "")
      setPhone(user.phone ?? "")
      setRole(user.role ?? "user")
      setCityId(user.city_id ? String(user.city_id) : "none")
    }
  }, [user?.id, user?.name, user?.email, user?.phone, user?.role, user?.city_id])
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({
          name,
          email: email || undefined,
          phone: phone || undefined,
          role,
          city_id: cityId && cityId !== "none" ? Number(cityId) : null,
        })
      }}
      className="space-y-4"
    >
      <div>
        <Label>{t("admin.name")}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" required />
      </div>
      <div>
        <Label>{t("auth.email")}</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label>{t("admin.phone")}</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" placeholder="+966..." />
      </div>
      <div>
        <Label>{t("admin.roleLabel")}</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>{t(`admin.role.${r}`, r.replace(/_/g, " "))}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>{t("addOffer.cityLabel")}</Label>
        <Select value={cityId} onValueChange={setCityId}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={t("common.optional")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("common.optional")}</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
