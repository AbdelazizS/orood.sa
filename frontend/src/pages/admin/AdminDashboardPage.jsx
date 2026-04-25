import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
} from "recharts"
import apiClient from "@/lib/apiClient"
import { Eye, ShoppingCart, DollarSign, Package, Users, FileText, TrendingUp, BarChart3, FolderTree, MapPin } from "lucide-react"

const CHART_COLORS = { primary: "#8884d8", secondary: "#82ca9d" }
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "@/store/useAuthStore"

const statCards = [
  { key: "products", labelKey: "admin.stats.products", icon: Package, color: "text-blue-600" },
  { key: "users", labelKey: "admin.stats.users", icon: Users, color: "text-green-600" },
  { key: "offers", labelKey: "admin.stats.offers", icon: FileText, color: "text-amber-600" },
  { key: "requests", labelKey: "admin.stats.requests", icon: FileText, color: "text-purple-600" },
  { key: "completed_orders", labelKey: "analytics.completedOrders", icon: Package, color: "text-orange-600" },
]

export function AdminDashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const role = user?.role ?? ""
  const isSuperAdmin = role === "super_admin"
  const isAdmin = role === "admin" || isSuperAdmin
  const isManager = role === "manager" || isAdmin
  const perms = Array.isArray(user?.permissions) ? user.permissions : []
  const hasAdminBidsPermission = perms.includes("*") || perms.includes("bids.admin_view")

  const dateTo = new Date()
  const dateFrom = new Date()
  dateFrom.setDate(dateFrom.getDate() - 14)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "analytics", "dashboard"],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set("date_from", dateFrom.toISOString().slice(0, 10))
      params.set("date_to", dateTo.toISOString().slice(0, 10))
      const res = await apiClient.get(`/admin/analytics?${params}`)
      const body = res?.data
      return (body?.data ?? body) ?? {}
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.dashboardTitle")}</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  const totals = (data?.totals && (data.totals.products > 0 || data.totals.users > 0))
    ? data.totals
    : (overviewData?.totals ?? data?.totals ?? {})
  const mostViewed = data?.most_viewed ?? []
  const mostSold = data?.most_sold ?? []
  const cheapest = data?.cheapest ?? []
  const productsByDay = data?.products_by_day ?? []
  const usersByDay = data?.users_by_day ?? []
  const offersVsRequests = data?.offers_vs_requests_trend ?? []
  const categories = overviewData?.categories ?? []
  const regions = overviewData?.regions ?? []
  const recentProducts = overviewData?.recent_products ?? []

  const allDates = [...new Set([...productsByDay.map((d) => d.date), ...usersByDay.map((d) => d.date)])].sort()
  const chartData =
    allDates.length > 0
      ? allDates.map((date) => ({
          date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          dateRaw: date,
          products: productsByDay.find((d) => d.date === date)?.count ?? 0,
          users: usersByDay.find((d) => d.date === date)?.count ?? 0,
        }))
      : (() => {
          const days = []
          for (let i = 13; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            days.push(d.toISOString().slice(0, 10))
          }
          return days.map((date) => ({
            date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            dateRaw: date,
            products: 0,
            users: 0,
          }))
        })()

  const offersVsRequestsData =
    offersVsRequests.length > 0
      ? offersVsRequests.map((d) => ({
          ...d,
          dateLabel: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        }))
      : chartData.map((d) => ({
          date: d.dateRaw,
          dateLabel: d.date,
          offers: 0,
          requests: 0,
        }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.dashboardTitle")}</h1>
        <p className="text-muted-foreground">{t("admin.dashboardDescription")}</p>
      </div>
      {!hasAdminBidsPermission ? (
        <Card className="border-amber-300 bg-amber-50/70">
          <CardContent className="pt-6 text-sm text-amber-800">
            {t(
              "admin.bidsPermissionMissingHint",
              "Bids page is hidden because this admin account is missing bids.admin_view permission. Assign it from Roles & Permissions."
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ key, labelKey, icon: Icon, color }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t(labelKey)}</CardTitle>
              <Icon className={`size-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals[key] ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5" />
              {t("admin.activityTitle")}
            </CardTitle>
            <CardDescription>{t("admin.activityDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full" style={{ height: 288, minHeight: 288 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Area type="monotone" dataKey="products" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.3} name="Products" />
                  <Area type="monotone" dataKey="users" stroke={CHART_COLORS.secondary} fill={CHART_COLORS.secondary} fillOpacity={0.3} name="Users" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5" />
              {t("admin.dailyActivityTitle")}
            </CardTitle>
            <CardDescription>{t("admin.dailyActivityDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="w-full" style={{ height: 288, minHeight: 288 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Bar dataKey="products" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} name="Products" />
                  <Bar dataKey="users" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} name="Users" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5" />
            {t("analytics.offersVsRequests", "Offers vs Requests Trend")}
          </CardTitle>
          <CardDescription>{t("analytics.offersVsRequestsDesc", "Daily new offers and requests")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full" style={{ height: 288, minHeight: 288 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={offersVsRequestsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dateLabel" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Line type="monotone" dataKey="offers" stroke={CHART_COLORS.primary} name={t("feed.offer")} strokeWidth={2} />
                  <Line type="monotone" dataKey="requests" stroke={CHART_COLORS.secondary} name={t("feed.request")} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
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
                {mostViewed.slice(0, 5).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link to={`/products/${p.id}`} className="hover:underline truncate block max-w-[140px]">
                        {p.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-end">{p.stats?.views ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
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
                {mostSold.slice(0, 5).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link to={`/products/${p.id}`} className="hover:underline truncate block max-w-[140px]">
                        {p.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-end">{p.stats?.purchases ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="size-4 text-muted-foreground" />
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
                {cheapest.slice(0, 5).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link to={`/products/${p.id}`} className="hover:underline truncate block max-w-[140px]">
                        {p.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-end">{p.price} SAR</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (categories.length > 0 || regions.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="size-5" />
                {t("overview.categories")}
              </CardTitle>
              <CardDescription>{t("overview.categoriesDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(cat.subcategories ?? []).map((s) => s.name).join(", ") || "—"}
                      </p>
                    </div>
                    <Badge variant="secondary">{cat.products_count ?? 0}</Badge>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                <Link to="/admin/categories">{t("overview.manageCategories")}</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-5" />
                {t("overview.regions")}
              </CardTitle>
              <CardDescription>{t("overview.regionsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {regions.map((region) => (
                  <div key={region.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{region.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(region.cities ?? []).map((c) => `${c.name} (${c.products_count})`).join(", ") || "—"}
                      </p>
                    </div>
                    <Badge variant="secondary">{region.products_count ?? 0}</Badge>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                <Link to="/admin/regions">{t("overview.manageRegions")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {isManager && recentProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-5" />
              {t("overview.recentListings")}
            </CardTitle>
            <CardDescription>{t("overview.recentListingsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.product")}</TableHead>
                    <TableHead>{t("feed.offer")}/{t("feed.request")}</TableHead>
                    <TableHead>{t("addOffer.categoryLabel")}</TableHead>
                    <TableHead>{t("addOffer.regionLabel")}</TableHead>
                    <TableHead>{t("admin.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentProducts.slice(0, 10).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link to={`/products/${p.id}`} className="font-medium hover:underline">
                          {p.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.type === "offer" ? "default" : "secondary"}>{p.type}</Badge>
                      </TableCell>
                      <TableCell>{p.category?.name ?? "—"}</TableCell>
                      <TableCell>{p.region?.name ?? p.city?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.moderation_status ?? "approved"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/admin/products">{t("overview.manageProducts")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
