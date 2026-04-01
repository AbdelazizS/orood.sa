import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { Search, FileText, User, Calendar, ChevronLeft, ChevronRight } from "lucide-react"

const ACTION_PREFIXES = ["user", "product", "category", "region", "task", "role", "audit"]

export function AdminAuditPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [search, actionFilter])

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-logs", search, actionFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (actionFilter) params.set("action", actionFilter)
      params.set("page", String(page))
      const { data: res } = await apiClient.get(`/admin/audit-logs?${params}`)
      return res ?? {}
    },
  })

  const logs = data?.data ?? []
  const meta = data?.meta ?? {}
  const total = meta.total ?? 0

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("audit.title", "Audit Logs")}</h1>
        <Skeleton className="h-96" />
      </div>
    )
  }

  const actions = [...new Set(logs.map((l) => l.action?.split(".")[0]).filter(Boolean))]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("audit.title", "Audit Logs")}</h1>
        <p className="text-muted-foreground">{t("audit.description", "Track admin actions and changes")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                {t("audit.recentActions", "Recent Actions")}
              </CardTitle>
              <CardDescription>{total} {t("audit.entries", "entries")}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute start-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder={t("admin.search", "Search...")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-8 w-48"
                />
              </div>
              <Select value={actionFilter || "all"} onValueChange={(v) => setActionFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t("audit.filterByAction", "Action")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {ACTION_PREFIXES.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">{t("audit.user", "User")}</TableHead>
                  <TableHead className="w-[200px]">{t("audit.action", "Action")}</TableHead>
                  <TableHead>{t("audit.date", "Date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      {t("audit.empty", "No audit logs yet")}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <User className="size-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium">{log.user?.name ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {t(`audit.actionLabel.${(log.action || "").replace(/\./g, "_")}`, log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="size-4" />
                          {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {(meta.last_page ?? 1) > 1 && (
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
    </div>
  )
}
