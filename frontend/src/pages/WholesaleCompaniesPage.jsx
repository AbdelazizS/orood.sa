import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { fetchWholesaleCompanies } from "@/services/wholesaleService"
import { useMainCategories } from "@/hooks/useCategories"
import { useRegions } from "@/hooks/useRegions"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WholesaleCompanyCard } from "@/components/wholesale/WholesaleCompanyCard"
import { getDirection, isRtlLanguage } from "@/lib/direction"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

export function WholesaleCompaniesPage() {
  const { t, i18n } = useTranslation()
  const dir = getDirection(i18n.language)
  const isRTL = isRtlLanguage(i18n.language)
  const CrumbIcon = isRTL ? ChevronLeft : ChevronRight
  const [search, setSearch] = useState("")
  const [categoryId, setCategoryId] = useState("all")
  const [cityId, setCityId] = useState("all")

  const params = useMemo(
    () => ({
      search: search || undefined,
      category_id: categoryId !== "all" ? categoryId : undefined,
      city_id: cityId !== "all" ? cityId : undefined,
      per_page: 24,
    }),
    [search, categoryId, cityId]
  )

  const { data } = useQuery({
    queryKey: ["wholesale", "companies", params],
    queryFn: () => fetchWholesaleCompanies(params),
  })
  const { data: categories = [] } = useMainCategories()
  const { data: regions = [] } = useRegions()
  const cities = regions.flatMap((r) => r.cities ?? [])
  const companies = data?.data ?? []

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:py-8" dir={dir}>
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">{t("nav.home")}</Link>
        <CrumbIcon className="size-4" />
        <Link to="/wholesale" className="hover:text-foreground">{t("wholesale.market.title")}</Link>
        <CrumbIcon className="size-4" />
        <span className="font-medium text-foreground">{t("wholesale.companies.title")}</span>
      </div>

      <div className={isRTL ? "text-end" : "text-start"}>
        <h1 className="text-2xl font-bold">{t("wholesale.companies.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("wholesale.companies.subtitle")}</p>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(250px,1fr)_190px_190px]">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pe-9"
              placeholder={t("wholesale.companies.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue placeholder={t("filters.allCategories")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cityId} onValueChange={setCityId}>
            <SelectTrigger><SelectValue placeholder={t("filters.allCities")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allCities")}</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city.id} value={String(city.id)}>{city.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {companies.map((company) => (
          <WholesaleCompanyCard key={company.id} company={company} t={t} dir={dir} />
        ))}
      </div>

      {companies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t("wholesale.companies.empty")}
          </CardContent>
        </Card>
      ) : null}

      <div className={cn("flex", isRTL ? "justify-end" : "justify-start")}>
        <Button variant="outline" asChild>
          <Link to="/wholesale">{t("wholesale.companies.backToMarket")}</Link>
        </Button>
      </div>
    </section>
  )
}
