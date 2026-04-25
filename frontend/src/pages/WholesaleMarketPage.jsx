import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Link, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/useAuthStore"
import {
  cancelWholesaleReservation,
  fetchWholesaleCompanies,
  fetchWholesaleMarketProducts,
  reserveWholesaleProduct,
} from "@/services/wholesaleService"
import { useMainCategories, useSubcategories } from "@/hooks/useCategories"
import { useRegions } from "@/hooks/useRegions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WholesaleProductCard } from "@/components/wholesale/WholesaleProductCard"
import { WholesaleCompanyCard } from "@/components/wholesale/WholesaleCompanyCard"
import { cn } from "@/lib/utils"
import { getDirection, isRtlLanguage } from "@/lib/direction"
import { Building2, ChevronLeft, ChevronRight, Search } from "lucide-react"

const sortOptions = ["newest", "price_asc", "price_desc", "discount", "popular"]
const categoryIcons = {
  electronics: "📱",
  furniture: "🛋️",
  computers: "💻",
  fashion: "👗",
  industrial: "🏭",
  default: "📦",
}

export function WholesaleMarketPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [search, setSearch] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [subcategoryId, setSubcategoryId] = useState("")
  const [cityId, setCityId] = useState("")
  const [sort, setSort] = useState("newest")
  const pageDir = getDirection(i18n.language)
  const isRTL = isRtlLanguage(i18n.language)
  const CrumbIcon = isRTL ? ChevronLeft : ChevronRight

  const params = useMemo(
    () => ({
      search: search || undefined,
      category_id: categoryId || undefined,
      subcategory_id: subcategoryId || undefined,
      city_id: cityId || undefined,
      sort,
    }),
    [search, categoryId, subcategoryId, cityId, sort]
  )

  const productsQuery = useQuery({
    queryKey: ["wholesale", "market", params],
    queryFn: () => fetchWholesaleMarketProducts(params),
  })
  const companiesQuery = useQuery({
    queryKey: ["wholesale", "companies", "teaser"],
    queryFn: () => fetchWholesaleCompanies({ per_page: 8 }),
  })
  const { data: categories = [] } = useMainCategories()
  const { data: subcategories = [] } = useSubcategories(categoryId || null)
  const { data: regions = [] } = useRegions()

  const reserveMutation = useMutation({
    mutationFn: ({ productId, quantity }) => reserveWholesaleProduct(productId, quantity),
    onSuccess: (res) => {
      if (res?.code === "already_reserved") {
        return
      }
      toast.success(res?.message ?? t("wholesale.market.reserveSuccess"))
      queryClient.invalidateQueries({ queryKey: ["wholesale", "market"] })
      queryClient.invalidateQueries({ queryKey: ["wholesale", "my-reservations"] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("wholesale.market.reserveError"))
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (productId) => cancelWholesaleReservation(productId),
    onSuccess: () => {
      toast.success(t("wholesale.market.cancelSuccess"))
      queryClient.invalidateQueries({ queryKey: ["wholesale", "market"] })
      queryClient.invalidateQueries({ queryKey: ["wholesale", "my-reservations"] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("wholesale.market.cancelError"))
    },
  })

  const products = productsQuery.data?.data ?? []
  const companies = companiesQuery.data?.data ?? []

  const popularCategories = categories.slice(0, 8)

  const handleReserve = (productId) => {
    if (!user) {
      toast.error(t("wholesale.market.loginRequired"))
      navigate("/login")
      return
    }
    reserveMutation.mutate({ productId, quantity: 1 })
  }

  const handleCancel = (productId) => {
    if (!user) {
      toast.error(t("wholesale.market.loginRequired"))
      navigate("/login")
      return
    }
    cancelMutation.mutate(productId)
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 md:py-8" dir={pageDir}>
      <div className="space-y-4">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">{t("nav.home")}</Link>
          <CrumbIcon className="size-4" />
          <span className="font-medium text-foreground">{t("wholesale.market.title")}</span>
        </div>
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className={cn("w-full md:w-auto", isRTL ? "text-end md:order-2" : "text-start md:order-1")}>
              <h1 className="text-2xl font-bold">{t("wholesale.market.title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("wholesale.market.heroSubtitle")}</p>
            </div>
            <div
              className={cn(
                "flex w-full flex-wrap items-center gap-2 md:w-auto",
                isRTL
                  ? "justify-end md:justify-start md:order-1"
                  : "justify-start md:justify-end md:order-2"
              )}
            >
              {user ? (
                <Button variant="outline" asChild>
                  <Link to="/wholesale/reservations">{t("wholesale.market.myReservations")}</Link>
                </Button>
              ) : null}
              <Button variant="outline" asChild className="gap-2">
                <Link to="/wholesale/companies">
                  <Building2 className="size-4" />
                  {t("wholesale.market.companiesList")}
                </Link>
              </Button>
            </div>
          
          </CardContent>
        </Card>
      </div>

      <div className="border-b border-border bg-background px-4 py-3 sm:px-0">
        <div
          className={cn(
            "grid grid-cols-1 gap-2 md:grid-cols-2",
            isRTL
              ? "xl:grid-cols-[190px_190px_190px_minmax(320px,1fr)_auto_auto]"
              : "xl:grid-cols-[minmax(320px,1fr)_190px_190px_190px_auto_auto]"
          )}
        >
          <div className="h-12">
            <Select value={categoryId || "all_categories"} onValueChange={(v) => setCategoryId(v === "all_categories" ? "" : v)}>
              <SelectTrigger className="h-full w-full rounded-md border-border">
                <SelectValue className="truncate text-sm" placeholder={t("filters.allCategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_categories">{t("filters.allCategories")}</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="h-12">
            <Select value={subcategoryId || "all_subcategories"} onValueChange={(v) => setSubcategoryId(v === "all_subcategories" ? "" : v)}>
              <SelectTrigger className="h-full w-full rounded-md border-border">
                <SelectValue className="truncate text-sm" placeholder={t("filters.allSubcategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_subcategories">{t("filters.allSubcategories")}</SelectItem>
                {subcategories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="h-12">
            <Select value={cityId || "all_cities"} onValueChange={(v) => setCityId(v === "all_cities" ? "" : v)}>
              <SelectTrigger className="h-full w-full rounded-md border-border">
                <SelectValue className="truncate text-sm" placeholder={t("filters.allCities")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_cities">{t("filters.allCities")}</SelectItem>
                {regions.flatMap((r) => r.cities ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex h-12 min-w-0 w-full rounded-md border border-input overflow-hidden">
            <Input
              type="search"
              placeholder={t("wholesale.market.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-full flex-1 min-w-0 rounded-none border-0 px-3 text-sm focus-visible:ring-0"
            />
            <Button
              type="button"
              size="icon"
              className="h-full w-12 shrink-0 rounded-none bg-primary text-primary-foreground hover:bg-primary/90"
              aria-label={t("feed.search")}
            >
              <Search className="size-[18px]" />
            </Button>
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-12 w-full rounded-md border-border md:w-auto min-w-[160px]">
              <SelectValue className="truncate text-sm" placeholder={t("wholesale.market.sortLabel")} />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {t(`wholesale.market.sort.${opt}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            asChild
            className="h-12 w-full rounded-md px-4 text-sm md:w-auto"
          >
            <Link to="/wholesale/companies" className="flex h-full items-center gap-2">
              <Building2 className="size-4" />
              {t("wholesale.market.companiesList")}
            </Link>
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <div className={cn("flex items-center justify-between", isRTL ? "" : "flex-row-reverse")}>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-primary">
            <Link to="/wholesale/companies">
              {t("common.all")}
              <CrumbIcon className="size-4" />
            </Link>
          </Button>
          <h2 className="text-lg font-semibold">{t("wholesale.market.popularCategories")}</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {popularCategories.map((cat) => {
            const isActive = String(cat.id) === String(categoryId)
            const icon = categoryIcons[String(cat.slug || "").toLowerCase()] ?? categoryIcons.default
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(isActive ? "" : String(cat.id))}
                className={cn(
                  "min-w-[96px] rounded-xl border p-3 text-center transition",
                  isActive ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                )}
              >
                <div className="text-2xl">{icon}</div>
                <p className="mt-1 line-clamp-1 text-xs font-medium">{cat.name}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className={cn("flex items-center justify-between", isRTL ? "" : "flex-row-reverse")}>
          <p className="text-sm text-muted-foreground">{t("wholesale.market.productsCount", { count: products.length })}</p>
          <h2 className="text-lg font-semibold">{t("wholesale.market.featuredProducts")}</h2>
        </div>
        {products.length === 0 && !productsQuery.isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {t("wholesale.market.empty")}
            </CardContent>
          </Card>
        ) : null}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <WholesaleProductCard
              key={product.id}
              product={product}
              t={t}
              dir={pageDir}
              onReserve={handleReserve}
              onCancel={handleCancel}
              reservePending={reserveMutation.isPending}
              cancelPending={cancelMutation.isPending}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className={cn("flex items-center justify-between", isRTL ? "" : "flex-row-reverse")}>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-primary">
            <Link to="/wholesale/companies">
              {t("common.all")}
              <CrumbIcon className="size-4" />
            </Link>
          </Button>
          <h2 className="text-lg font-semibold">{t("wholesale.market.trustedCompanies")}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {companies.slice(0, 4).map((company) => (
            <WholesaleCompanyCard key={company.id} company={company} t={t} compact dir={pageDir} />
          ))}
          {companies.length === 0 && !companiesQuery.isLoading ? (
            <Card className="sm:col-span-2 lg:col-span-4">
              <CardHeader>
                <CardTitle className={cn("text-sm text-muted-foreground", isRTL ? "text-end" : "text-start")}>
                  {t("wholesale.companies.empty")}
                </CardTitle>
              </CardHeader>
            </Card>
          ) : null}
        </div>
      </section>
    </section>
  )
}
