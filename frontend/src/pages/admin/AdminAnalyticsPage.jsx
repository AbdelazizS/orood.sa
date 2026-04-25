import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts"
import { jsPDF } from "jspdf"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import {
  Eye,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Download,
  Calendar,
  MapPin,
  FolderTree,
} from "lucide-react"
import { Link } from "react-router-dom"

/**
 * Chart Design Guidelines (big-company standards: Amazon, Uber, Noon)
 * - Colors: Use --chart-1 through --chart-5 for consistency
 * - Bar charts: Horizontal layout, labels on Y-axis, no overlap
 * - Pie charts: Donut style, legend table beside (no slice labels to avoid overlap)
 * - Responsive: ResponsiveContainer with explicit parent dimensions
 * - RTL: Use name_ar when i18n.language starts with "ar"
 */
const DATE_PRESETS = [
  { key: "7d", labelKey: "analytics.datePreset7", days: 7 },
  { key: "30d", labelKey: "analytics.datePreset30", days: 30 },
  { key: "90d", labelKey: "analytics.datePreset90", days: 90 },
]

const PRIMARY_STATS = [
  { key: "products", labelKey: "admin.stats.products", icon: Package },
  { key: "users", labelKey: "admin.stats.users", icon: Users },
  { key: "offers", labelKey: "admin.stats.offers", icon: FileText },
  { key: "requests", labelKey: "admin.stats.requests", icon: FileText },
]

const SECONDARY_STATS = [
  { key: "active_users", labelKey: "analytics.activeUsers", icon: Users },
  { key: "verified_sellers", labelKey: "analytics.verifiedSellers", icon: Users },
  { key: "completed_orders", labelKey: "analytics.completedOrders", icon: ShoppingCart },
]

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-colors hover:bg-muted/30">
      <p className="text-muted-foreground mb-1 text-sm font-medium">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {Icon && <Icon className="text-muted-foreground/50 mt-2 size-5" />}
    </div>
  )
}

function ChartCard({ title, description, children, className = "" }) {
  return (
    <Card className={className}>
      <CardHeader className="space-y-1 border-b pb-4 shrink-0">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-6 min-h-0 flex flex-col">{children}</CardContent>
    </Card>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2" style={{ color: entry.color }}>
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

export function AdminAnalyticsPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const [datePreset, setDatePreset] = useState("30d")
  const [reportPeriod, setReportPeriod] = useState("month")
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [categoryId, setCategoryId] = useState("all")
  const [regionId, setRegionId] = useState("all")

  const applyPreset = (preset) => {
    const p = DATE_PRESETS.find((x) => x.key === preset)
    if (!p) return
    setDatePreset(preset)
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - p.days)
    setDateFrom(start.toISOString().slice(0, 10))
    setDateTo(end.toISOString().slice(0, 10))
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "analytics", dateFrom, dateTo, categoryId, regionId, reportPeriod],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set("date_from", dateFrom)
      params.set("date_to", dateTo)
      params.set("period", reportPeriod)
      if (categoryId && categoryId !== "all") params.set("category_id", categoryId)
      if (regionId && regionId !== "all") params.set("region_id", regionId)
      const res = await apiClient.get(`/admin/analytics?${params}`)
      const body = res?.data
      const payload = body?.data ?? body ?? {}
      if (!payload || typeof payload !== "object") return {}
      return payload
    },
  })

  const { data: overviewData } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/overview")
      const body = res?.data
      return (body?.data ?? body) ?? {}
    },
  })

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/admin/categories")
      return res?.data ?? []
    },
  })

  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/regions")
      return res?.data ?? []
    },
  })

  const role = user?.role ?? ""
  const isSuperAdmin = role === "super_admin"
  const isAdmin = role === "admin" || isSuperAdmin
  const isManager = role === "manager" || isAdmin

  const totals = (data?.totals && (data.totals.products > 0 || data.totals.users > 0))
    ? data.totals
    : (overviewData?.totals ?? data?.totals ?? {})
  const mostViewed = data?.most_viewed ?? []
  const mostSold = data?.most_sold ?? []
  const cheapest = data?.cheapest ?? []
  const productsByDay = data?.products_by_day ?? []
  const usersByDay = data?.users_by_day ?? []
  const offersVsRequests = data?.offers_vs_requests_trend ?? []
  const reports = data?.reports ?? {}
  const topCategoriesRaw = data?.top_categories ?? []
  const topCategories = topCategoriesRaw.map((c) => ({
    ...c,
    name: (i18n.language?.startsWith("ar") && c.name_ar) ? c.name_ar : c.name,
  }))
  const regionalDistRaw = data?.regional_distribution ?? []
  const regionalDistTotal = regionalDistRaw.reduce((sum, r) => sum + (r.count ?? 0), 0)
  const regionalDist = regionalDistRaw.map((r) => ({
    ...r,
    name: (i18n.language?.startsWith("ar") && r.name_ar) ? r.name_ar : r.name,
    percent: regionalDistTotal > 0 ? ((r.count ?? 0) / regionalDistTotal) * 100 : 0,
  }))

  const allDates = [...new Set([...productsByDay.map((d) => d.date), ...usersByDay.map((d) => d.date)])].sort()
  const chartData = allDates.length > 0
    ? allDates.map((date) => ({
        date: new Date(date).toLocaleDateString(i18n.language?.startsWith("ar") ? "ar-SA" : "en-US", { month: "short", day: "numeric" }),
        dateRaw: date,
        products: productsByDay.find((d) => d.date === date)?.count ?? 0,
        users: usersByDay.find((d) => d.date === date)?.count ?? 0,
      }))
    : (() => {
        const days = []
        for (let i = 29; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          days.push(d.toISOString().slice(0, 10))
        }
        return days.map((date) => ({
          date: new Date(date).toLocaleDateString(i18n.language?.startsWith("ar") ? "ar-SA" : "en-US", { month: "short", day: "numeric" }),
          dateRaw: date,
          products: 0,
          users: 0,
        }))
      })()

  const offersVsRequestsData =
    offersVsRequests.length > 0
      ? offersVsRequests.map((d) => ({
          ...d,
          dateLabel: new Date(d.date).toLocaleDateString(i18n.language?.startsWith("ar") ? "ar-SA" : "en-US", { month: "short", day: "numeric" }),
        }))
      : chartData.map((d) => ({
          date: d.dateRaw,
          dateLabel: d.date,
          offers: 0,
          requests: 0,
        }))

  // Chart design: consistent palette (big-company standards)
  const chartColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ]

  const handleExportCSV = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Products", totals.products ?? 0],
      ["Total Users", totals.users ?? 0],
      ["Offers", totals.offers ?? 0],
      ["Requests", totals.requests ?? 0],
      ["Active Users", totals.active_users ?? 0],
      ["Sellers", totals.verified_sellers ?? 0],
      ["Completed Orders", totals.completed_orders ?? 0],
    ]
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `arooth-analytics-${dateFrom}-${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 20
    const contentW = pageW - margin * 2
    let y = margin

    const addFooter = (pageNum, totalPages) => {
      doc.setDrawColor(230, 230, 230)
      doc.line(margin, pageH - 18, pageW - margin, pageH - 18)
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(
        `Arooth Analytics · ${dateFrom} to ${dateTo} · ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`,
        margin,
        pageH - 10
      )
      doc.text(`Page ${pageNum}/${totalPages}`, pageW - margin - 30, pageH - 10)
      doc.setTextColor(0, 0, 0)
    }

    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Analytics Report", margin, y)
    y += 10

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 100, 100)
    doc.text(`Period: ${dateFrom} — ${dateTo}`, margin, y)
    y += 14

    const metrics = [
      ["Products", totals.products ?? 0],
      ["Users", totals.users ?? 0],
      ["Offers", totals.offers ?? 0],
      ["Requests", totals.requests ?? 0],
      ["Active Users", totals.active_users ?? 0],
      ["Sellers", totals.verified_sellers ?? 0],
      ["Completed Orders", totals.completed_orders ?? 0],
    ]

    const colW = contentW / 2
    const rowH = 8
    metrics.forEach((row, i) => {
      if (y + rowH > pageH - 25) {
        doc.addPage()
        y = margin
      }
      doc.setFillColor(i % 2 === 1 ? 248 : 255, 250, 252)
      doc.rect(margin, y, contentW, rowH, "F")
      doc.setDrawColor(230, 230, 230)
      doc.rect(margin, y, contentW, rowH, "S")
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(row[0], margin + 4, y + 5.5)
      doc.text(String(row[1]), margin + colW + 4, y + 5.5)
      y += rowH
    })
    y += 14

    if (topCategories.length > 0) {
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text("Top Categories", margin, y)
      y += 8
      topCategories.slice(0, 8).forEach((cat, i) => {
        doc.setFont("helvetica", "normal")
        doc.text(`${cat.name}: ${cat.count}`, margin, y + 5)
        y += 7
      })
    }

    const ensureSpace = (needed) => {
      if (y + needed > pageH - 25) {
        doc.addPage()
        y = margin
      }
    }

    if ((reports.top_products ?? []).length > 0) {
      ensureSpace(24)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text("Top products (orders in period)", margin, y)
      y += 8
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      ;(reports.top_products ?? []).slice(0, 10).forEach((p) => {
        ensureSpace(8)
        const line = `${(p.title ?? "").slice(0, 70)} — ${p.purchase_count ?? 0} orders, ${Number(p.total_amount ?? 0).toFixed(0)} SAR`
        doc.text(line, margin, y)
        y += 7
      })
      y += 4
    }

    if ((reports.top_cities ?? []).length > 0) {
      ensureSpace(24)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text("Top cities (by orders)", margin, y)
      y += 8
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      ;(reports.top_cities ?? []).slice(0, 10).forEach((c) => {
        ensureSpace(8)
        doc.text(`${c.name ?? "—"}: ${c.purchase_count ?? 0} orders`, margin, y)
        y += 7
      })
    }

    const totalPages = doc.internal.getNumberOfPages()
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p)
      addFooter(p, totalPages)
    }
    doc.save(`Arooth-Analytics-${dateFrom}-${dateTo}.pdf`)
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError) {
    const errMsg = error?.response?.data?.message ?? error?.message ?? "Failed to load analytics"
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("analytics.title")}</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="font-medium text-destructive">{t("common.error")}: {errMsg}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {error?.response?.status === 401 ? t("auth.loginError") : t("common.reload")}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("analytics.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("analytics.description")}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border bg-muted/30 p-1">
            {DATE_PRESETS.map((p) => (
              <Button
                key={p.key}
                variant={datePreset === p.key ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => applyPreset(p.key)}
              >
                {t(p.labelKey)}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
            <Calendar className="size-4 text-muted-foreground" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-32 border-0 bg-transparent text-sm outline-none"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-32 border-0 bg-transparent text-sm outline-none"
            />
          </div>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-9 w-[140px]">
              <FolderTree className="me-2 size-4 text-muted-foreground" />
              <SelectValue placeholder={t("addOffer.categoryLabel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name_ar || c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={regionId} onValueChange={setRegionId}>
            <SelectTrigger className="h-9 w-[130px]">
              <MapPin className="me-2 size-4 text-muted-foreground" />
              <SelectValue placeholder={t("addOffer.regionLabel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={reportPeriod} onValueChange={setReportPeriod}>
            <SelectTrigger className="h-9 w-[100px]">
              <SelectValue placeholder={t("analytics.period", "Period")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t("analytics.week", "Week")}</SelectItem>
              <SelectItem value="month">{t("analytics.month", "Month")}</SelectItem>
              <SelectItem value="year">{t("analytics.year", "Year")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-9" onClick={handleExportCSV}>
              <Download className="me-1.5 size-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={handleExportPDF}>
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRIMARY_STATS.map(({ key, labelKey, icon }) => (
          <StatCard
            key={key}
            label={t(labelKey)}
            value={totals[key] ?? 0}
            icon={icon}
          />
        ))}
      </div>

      {/* Secondary KPIs (admin only) */}
      {(isSuperAdmin || isAdmin) && (
        <div className="grid gap-4 sm:grid-cols-3">
          {SECONDARY_STATS.map(({ key, labelKey, icon }) => (
            <StatCard
              key={key}
              label={t(labelKey)}
              value={totals[key] ?? 0}
              icon={icon}
            />
          ))}
        </div>
      )}

      {/* Charts */}
      {isManager && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title={t("analytics.offersVsRequests")}
              description={t("analytics.offersVsRequestsDesc")}
            >
              <div className="h-72 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={offersVsRequestsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="offers" stroke={chartColors[0]} name={t("feed.offer")} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="requests" stroke={chartColors[1]} name={t("feed.request")} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title={t("analytics.topCategories")}
              description={t("analytics.topCategoriesDesc")}
            >
              <div className="h-80 w-full min-h-0 overflow-visible" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={topCategories.length > 0 ? topCategories.slice(0, 5) : [{ name: "—", count: 0 }]}
                    margin={{ top: 16, right: 24, left: 8, bottom: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                      interval={0}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill={chartColors[0]} radius={[0, 4, 4, 0]} name={t("analytics.topCategoriesDesc")} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title={t("analytics.regionalDistribution")}
              description={t("analytics.regionalDistributionDesc")}
            >
              <div className="h-72 w-full min-h-[280px] min-w-0" style={{ position: "relative" }}>
                {regionalDist.length > 0 ? (
                  <div className="flex h-full w-full flex-col gap-4 md:flex-row md:items-center md:gap-6">
                    <div className="h-[200px] w-full max-w-[220px] shrink-0 md:mx-0 md:ms-auto md:me-4">
                      <ResponsiveContainer width="100%" height="100%" debounce={1}>
                      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                        <Pie
                          data={regionalDist}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          innerRadius={24}
                          paddingAngle={2}
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        >
                          {regionalDist.map((_, i) => (
                            <Cell key={i} fill={chartColors[i % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) =>
                            active && payload?.[0] ? (
                              <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
                                <p className="font-medium">{payload[0].name}</p>
                                <p className="text-muted-foreground">{t("admin.stats.products")}: {payload[0].value}</p>
                                <p className="text-muted-foreground text-xs">{Number(payload[0].payload?.percent ?? 0).toFixed(1)}%</p>
                              </div>
                            ) : null
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    </div>
                    <div className="flex flex-1 flex-col justify-center gap-2 overflow-auto">
                      {regionalDist.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span
                            className="size-3 shrink-0 rounded-sm"
                            style={{ backgroundColor: chartColors[i % chartColors.length] }}
                          />
                          <span className="min-w-0 truncate font-medium">{r.name}</span>
                          <span className="shrink-0 text-muted-foreground">{r.count}</span>
                          <span className="shrink-0 font-medium">{Number(r.percent).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-muted-foreground">{t("analytics.noData")}</p>
                  </div>
                )}
              </div>
            </ChartCard>

            <ChartCard
              title={t("admin.activityTitle")}
              description={t("admin.activityDescription")}
            >
              <div className="h-72 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="products" stroke={chartColors[0]} fill={chartColors[0]} fillOpacity={0.2} name="Products" />
                    <Area type="monotone" dataKey="users" stroke={chartColors[1]} fill={chartColors[1]} fillOpacity={0.2} name="Users" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        </div>
      )}

      {/* Reports: Top products/sellers/buyers/cities */}
      {isManager && (reports.top_products?.length > 0 || reports.top_sellers?.length > 0 || reports.top_buyers?.length > 0 || reports.top_cities?.length > 0) && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">{t("analytics.reportsTitle", "Reports")} ({reportPeriod})</h2>
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Package className="size-4 text-muted-foreground" />
                  {t("analytics.topProducts", "Top Products")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.product")}</TableHead>
                      <TableHead className="text-end">{t("admin.sold")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reports.top_products ?? []).slice(0, 5).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link to={`/products/${p.id}`} className="max-w-[120px] truncate hover:underline">
                            {p.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-end font-medium">{p.purchase_count ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Users className="size-4 text-muted-foreground" />
                  {t("analytics.topSellers", "Top Sellers")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.name")}</TableHead>
                      <TableHead className="text-end">{t("admin.sold")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reports.top_sellers ?? []).slice(0, 5).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="max-w-[120px] truncate">{s.name}</TableCell>
                        <TableCell className="text-end font-medium">{s.order_count ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <ShoppingCart className="size-4 text-muted-foreground" />
                  {t("analytics.topBuyers", "Top Buyers")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.name")}</TableHead>
                      <TableHead className="text-end">{t("admin.sold")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reports.top_buyers ?? []).slice(0, 5).map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="max-w-[120px] truncate">{b.name}</TableCell>
                        <TableCell className="text-end font-medium">{b.order_count ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="size-4 text-muted-foreground" />
                  {t("analytics.topCities", "Top Cities")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("addOffer.cityLabel", "City")}</TableHead>
                      <TableHead className="text-end">{t("admin.sold")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reports.top_cities ?? []).slice(0, 5).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell className="text-end font-medium">{c.purchase_count ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Performance Tables */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">{t("admin.performanceSection")}</h2>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Eye className="size-4 text-muted-foreground" />
                {t("admin.mostViewed")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.product")}</TableHead>
                    <TableHead className="text-end">{t("admin.views")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mostViewed.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center text-sm text-muted-foreground">
                        {t("analytics.noData")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    mostViewed.slice(0, 5).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link to={`/products/${p.id}`} className="max-w-[160px] truncate hover:underline">
                            {p.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-end font-medium">{p.stats?.views ?? 0}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <ShoppingCart className="size-4 text-muted-foreground" />
                {t("admin.mostSold")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.product")}</TableHead>
                    <TableHead className="text-end">{t("admin.sold")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mostSold.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center text-sm text-muted-foreground">
                        {t("analytics.noData")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    mostSold.slice(0, 5).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link to={`/products/${p.id}`} className="max-w-[160px] truncate hover:underline">
                            {p.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-end font-medium">{p.stats?.purchases ?? 0}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                {t("admin.cheapest")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.product")}</TableHead>
                    <TableHead className="text-end">{t("admin.price")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cheapest.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center text-sm text-muted-foreground">
                        {t("analytics.noData")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    cheapest.slice(0, 5).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link to={`/products/${p.id}`} className="max-w-[160px] truncate hover:underline">
                            {p.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-end font-medium">{p.price} {t("common.currency")}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
