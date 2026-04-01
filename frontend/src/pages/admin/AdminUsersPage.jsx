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
import { MoreHorizontal, Pencil, Loader2, Ban, UserX, Search, ShieldCheck, Wallet, Check, Eye } from "lucide-react"
import { VerificationBadge } from "@/components/auth/VerificationBadge"

const ROLES = ["super_admin", "admin", "manager", "employee", "seller", "buyer", "user"]
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

function userColumns({ t, i18n, setEditingUser, setVerifyUser, modMutation, navigate }) {
  return [
    { id: "name", header: t("admin.name", "الاسم"), cell: ({ row }) => row.original.name },
    { id: "email", header: t("auth.email", "البريد الإلكتروني"), cell: ({ row }) => row.original.email },
    { id: "phone", header: t("admin.phone", "الجوال"), cell: ({ row }) => row.original.phone || "—" },
    {
      id: "role",
      header: t("auth.role", "الدور"),
      cell: ({ row }) => (
        <Badge variant={["admin", "super_admin", "manager", "employee"].includes(row.original.role) ? "default" : "secondary"}>
          {t(`admin.role.${row.original.role}`, row.original.role?.replace(/_/g, " "))}
        </Badge>
      ),
    },
    {
      id: "city",
      header: t("addOffer.cityLabel", "المدينة"),
      cell: ({ row }) => {
        const city = row.original.city
        return city ? (i18n.language?.startsWith("ar") && city.name_ar ? city.name_ar : city.name) : "—"
      },
    },
    {
      id: "verification",
      header: t("admin.verificationBadge", "التوثيق"),
      cell: ({ row }) => (
        <VerificationBadge level={row.original.verification_level} size="sm" />
      ),
    },
    {
      id: "guarantee",
      header: t("guarantee.title", "الضمان المالي"),
      cell: ({ row }) => {
        const amt = row.original.financial_guarantee ?? 0
        const hasGuarantee = amt > 0
        return (
          <div className="flex items-center gap-2">
            {hasGuarantee ? (
              <>
                <Check className="size-4 text-green-600" />
                <span>{Number(amt).toLocaleString()} {t("common.currency", "ر.س")}</span>
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
      header: t("admin.status", "الحالة"),
      cell: ({ row }) => {
        const u = row.original
        return (
          <div className="flex gap-1">
            {u.banned_at && <Badge variant="destructive">{t("admin.banned", "محظور")}</Badge>}
            {u.suspended_at && !u.banned_at && <Badge variant="secondary">{t("admin.suspended", "معلق")}</Badge>}
            {!u.banned_at && !u.suspended_at && (
              <Badge variant="outline" className="text-green-600 border-green-600">{t("admin.active", "نشط")}</Badge>
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
                {t("admin.viewProfile", "عرض الملف")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditingUser(user)}>
                <Pencil className="me-2 size-4" />
                {t("admin.edit", "تحرير")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setVerifyUser(user)}>
                <ShieldCheck className="me-2 size-4" />
                {t("admin.setVerification", "تعيين التوثيق")}
              </DropdownMenuItem>
              {["seller", "buyer", "user"].includes(user.role) && (
                <>
                  {user.banned_at ? (
                    <DropdownMenuItem onClick={() => modMutation.mutate({ id: user.id, action: "unban" })}>
                      <Ban className="me-2 size-4" />
                      {t("admin.unban", "إلغاء الحظر")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => modMutation.mutate({ id: user.id, action: "ban" })}>
                      <Ban className="me-2 size-4" />
                      {t("admin.ban", "حظر")}
                    </DropdownMenuItem>
                  )}
                  {user.suspended_at ? (
                    <DropdownMenuItem onClick={() => modMutation.mutate({ id: user.id, action: "unsuspend" })}>
                      <UserX className="me-2 size-4" />
                      {t("admin.unsuspend", "إلغاء التعليق")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => modMutation.mutate({ id: user.id, action: "suspend" })}>
                      <UserX className="me-2 size-4" />
                      {t("admin.suspend", "تعليق")}
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {(user.financial_guarantee ?? 0) > 0 && (
                <DropdownMenuItem onClick={() => modMutation.mutate({ id: user.id, action: "refund-guarantee" })}>
                  <Wallet className="me-2 size-4" />
                  {t("admin.refundGuarantee", "استرداد الضمان")}
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

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.put(`/admin/users/${id}`, payload),
    onSuccess: () => {
      setEditingUser(null)
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast.success(t("admin.updateSuccess", "تم التحديث بنجاح"))
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
      if (variables.action === "verify") toast.success(t("admin.verificationUpdated", "تم تحديث التوثيق"))
      else if (variables.action === "refund-guarantee") toast.success(t("guarantee.refunded", "تم استرداد الضمان"))
      else if (variables.action === "ban") toast.success(t("admin.userBanned", "تم حظر المستخدم"))
      else if (variables.action === "unban") toast.success(t("admin.userUnbanned", "تم إلغاء حظر المستخدم"))
      else if (variables.action === "suspend") toast.success(t("admin.userSuspended", "تم تعليق المستخدم"))
      else if (variables.action === "unsuspend") toast.success(t("admin.userUnsuspended", "تم إلغاء تعليق المستخدم"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.error"))
    },
  })

  const users = data?.data ?? []
  const meta = data?.meta ?? {}
  const total = meta.total ?? 0

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.usersTitle", "إدارة المستخدمين")}</h1>
        <Skeleton className="h-64" />
      </div>
    )
  }

  const columns = userColumns({ t, i18n, setEditingUser, setVerifyUser, modMutation, navigate })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.usersTitle", "إدارة المستخدمين")}</h1>
          <p className="text-muted-foreground">{t("admin.usersDescription", "عرض وإدارة حسابات المستخدمين")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute start-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t("admin.search", "بحث...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-8 w-48"
            />
          </div>
          <Select value={roleFilter || "all"} onValueChange={(v) => setRoleFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t("admin.roleLabel", "الدور")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all", "الكل")}</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>{t(`admin.role.${r}`, r.replace(/_/g, " "))}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cityFilter || "all"} onValueChange={(v) => setCityFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("addOffer.cityLabel", "المدينة")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all", "الكل")}</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
          <Select value={verificationFilter || "all"} onValueChange={(v) => setVerificationFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("admin.verificationBadge", "التوثيق")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all", "الكل")}</SelectItem>
              {VERIFICATION_LEVELS.map((v) => (
                <SelectItem key={v.value} value={v.value}>{t(v.labelKey, v.value.replace(/_/g, " "))}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={memberFilter || "all"} onValueChange={(v) => setMemberFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("admin.memberFilter", "فلتر الأعضاء")} />
            </SelectTrigger>
            <SelectContent>
              {MEMBER_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{t(f.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <DialogTitle>{t("admin.editUser", "تعديل المستخدم")}</DialogTitle>
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
    </div>
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
          <DialogTitle>{t("admin.setVerification", "تعيين التوثيق")}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSave({ verification_level: level })
          }}
          className="space-y-4"
        >
          <div>
            <Label>{t("admin.verificationLevel", "مستوى التوثيق")}</Label>
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
        <Label>{t("admin.name", "الاسم")}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" required />
      </div>
      <div>
        <Label>{t("auth.email", "البريد الإلكتروني")}</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label>{t("admin.phone", "الجوال")}</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" placeholder="+966..." />
      </div>
      <div>
        <Label>{t("admin.roleLabel", "الدور")}</Label>
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
        <Label>{t("addOffer.cityLabel", "المدينة")}</Label>
        <Select value={cityId} onValueChange={setCityId}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={t("common.optional", "اختياري")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("common.optional", "—")}</SelectItem>
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
