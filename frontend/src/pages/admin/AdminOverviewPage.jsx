import { useState } from "react"
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
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { Link } from "react-router-dom"
import { FolderTree, MapPin, Package, Search } from "lucide-react"

export function AdminOverviewPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [typeFilter, setTypeFilter] = useState("all")
  const [search, setSearch] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/admin/overview")
      return res?.data ?? {}
    },
  })

  const role = user?.role ?? ""
  const isSuperAdmin = role === "super_admin"
  const isAdmin = role === "admin" || isSuperAdmin
  const isManager = role === "manager" || isAdmin

  const categories = data?.categories ?? []
  const regions = data?.regions ?? []
  let recentProducts = data?.recent_products ?? []

  if (typeFilter && typeFilter !== "all") {
    recentProducts = recentProducts.filter((p) => p.type === typeFilter)
  }
  if (search) {
    const q = search.toLowerCase()
    recentProducts = recentProducts.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("overview.title", "Overview")}</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("overview.title", "Overview")}</h1>
        <p className="text-muted-foreground">
          {t("overview.description", "Categories, regions, offers & requests")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="size-5" />
                {t("overview.categories", "Categories")}
              </CardTitle>
              <CardDescription>{t("overview.categoriesDesc", "Offers/requests per category")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto space-y-2">
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
                <Link to="/admin/categories">{t("overview.manageCategories", "Manage Categories")}</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-5" />
                {t("overview.regions", "Regions & Cities")}
              </CardTitle>
              <CardDescription>{t("overview.regionsDesc", "Offers/requests per region")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto space-y-2">
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
                <Link to="/admin/regions">{t("overview.manageRegions", "Manage Regions")}</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {isManager && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="size-5" />
                  {t("overview.recentListings", "Recent Offers & Requests")}
                </CardTitle>
                <CardDescription>{t("overview.recentListingsDesc", "Latest published listings")}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute start-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder={t("overview.search", "Search...")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="ps-8 w-48"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    <SelectItem value="offer">{t("feed.offer")}</SelectItem>
                    <SelectItem value="request">{t("feed.request")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
                {recentProducts.slice(0, 15).map((p) => (
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
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/admin/products">{t("overview.manageProducts", "Manage Products")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
