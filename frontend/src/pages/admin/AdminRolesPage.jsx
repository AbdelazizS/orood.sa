import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import apiClient from "@/lib/apiClient"
import { Loader2 } from "lucide-react"
import { usePermission } from "@/hooks/usePermission"

const EMPTY_IDS = []

export function AdminRolesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canAssignRoles = usePermission("users.assign_roles")
  const [selectedRole, setSelectedRole] = useState("admin")
  const syncKeyRef = useRef("")

  const { data: permissions } = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/permissions")
      return data?.data ?? []
    },
  })

  const { data: roles } = useQuery({
    queryKey: ["admin", "permissions", "roles"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/permissions/roles")
      return data?.data ?? []
    },
  })

  const { data: rolePermissionIds, isLoading: loadingPerms } = useQuery({
    queryKey: ["admin", "permissions", "role", selectedRole],
    queryFn: async () => {
      const { data } = await apiClient.get(`/admin/permissions/roles/${selectedRole}`)
      return data?.data ?? EMPTY_IDS
    },
    enabled: !!selectedRole,
  })

  const syncMutation = useMutation({
    mutationFn: (permissionIds) =>
      apiClient.put(`/admin/permissions/roles/${selectedRole}`, { permission_ids: permissionIds }),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["admin", "permissions", "role", selectedRole] })
    },
  })

  const permIds = rolePermissionIds ?? EMPTY_IDS
  const permIdsKey = Array.isArray(permIds) ? permIds.join(",") : ""
  const groups = [...new Set((permissions ?? []).map((p) => p.group))]
  const [selected, setSelected] = useState(() => new Set(permIds))

  useEffect(() => {
    const key = `${selectedRole}:${permIdsKey}`
    if (key !== syncKeyRef.current) {
      syncKeyRef.current = key
      const ids = permIdsKey ? permIdsKey.split(",").map(Number).filter((n) => !Number.isNaN(n)) : []
      setSelected(new Set(ids))
    }
  }, [selectedRole, permIdsKey])

  const handleToggle = (permId, checked) => {
    const next = new Set(selected)
    if (checked) next.add(permId)
    else next.delete(permId)
    setSelected(next)
  }

  const handleSave = () => {
    syncMutation.mutate([...selected])
  }

  const rolesList = roles ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.roles")}</h1>
        <p className="text-muted-foreground">{t("admin.rolesDescription", "Manage role permissions")}</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="text-sm font-medium">{t("admin.roleLabel", "Role")}</label>
              <Select
                value={selectedRole}
                onValueChange={(r) => {
                  setSelectedRole(r)
                  syncKeyRef.current = ""
                  setSelected(new Set())
                }}
              >
                <SelectTrigger className="w-40 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rolesList.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`admin.role.${r}`, r.replace(/_/g, " "))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={!canAssignRoles || syncMutation.isPending} className="mt-6">
              {syncMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("admin.savePermissions", "Save Permissions")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPerms ? (
            <div className="flex justify-center p-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group}>
                  <h3 className="font-medium capitalize mb-2">{group}</h3>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {(permissions ?? [])
                      .filter((p) => p.group === group)
                      .map((p) => (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={selected.has(p.id)}
                            disabled={!canAssignRoles}
                            onCheckedChange={(c) => handleToggle(p.id, !!c)}
                          />
                          <span className="text-sm">{t(`permissions.${(p.name || "").replace(/\./g, "_")}`, p.name)}</span>
                        </label>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
