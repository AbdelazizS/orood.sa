import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { Eye, MapPin, Globe, TrendingUp } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export function AdminVisitorsPage() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState("week")

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "visitors", period],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set("period", period)
      const { data: res } = await apiClient.get(`/admin/visitors?${params}`)
      return res?.data ?? {}
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.visitorsTitle", "Visitors")}</h1>
        <Skeleton className="h-64" />
      </div>
    )
  }

  const d = data ?? {}
  const byDay = d.by_day ?? []
  const chartData = byDay.map((x) => ({
    date: x.date,
    visits: x.unique_visits ?? 0,
    views: x.views ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.visitorsTitle", "Visitors")}</h1>
          <p className="text-muted-foreground text-sm">{t("admin.visitorsDesc", "Visitor analytics")}</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">{t("analytics.day", "Day")}</SelectItem>
            <SelectItem value="week">{t("analytics.week", "Week")}</SelectItem>
            <SelectItem value="month">{t("analytics.month", "Month")}</SelectItem>
            <SelectItem value="year">{t("analytics.year", "Year")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <Eye className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">{t("admin.uniqueVisits", "Unique visits")}</p>
              <p className="text-2xl font-semibold">{d.total_visits ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-green-500/10 p-3">
              <TrendingUp className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">{t("admin.pageViews", "Page views")}</p>
              <p className="text-2xl font-semibold">{d.total_page_views ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.visitorsOverTime", "Visitors over time")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Area type="monotone" dataKey="visits" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} name={t("admin.uniqueVisits", "Unique visits")} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Globe className="size-4" />
              {t("admin.topPaths", "Top paths")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.path", "Path")}</TableHead>
                  <TableHead className="text-end">{t("admin.views", "Views")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(d.top_paths ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      {t("analytics.noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  (d.top_paths ?? []).map((p) => (
                    <TableRow key={p.path}>
                      <TableCell className="max-w-[200px] truncate font-mono text-xs">{p.path || "/"}</TableCell>
                      <TableCell className="text-end">{p.count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="size-4" />
              {t("admin.topCities", "Top cities")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("addOffer.cityLabel", "City")}</TableHead>
                  <TableHead className="text-end">{t("admin.views", "Views")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(d.top_cities ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      {t("analytics.noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  (d.top_cities ?? []).map((c) => (
                    <TableRow key={c.city}>
                      <TableCell>{c.city}</TableCell>
                      <TableCell className="text-end">{c.count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
