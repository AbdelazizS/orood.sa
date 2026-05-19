import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { fetchWholesaleCompanies } from "@/services/wholesaleService"
import { useMainCategories } from "@/hooks/useCategories"
import { useRegions } from "@/hooks/useRegions"
import { useFiltersStore } from "@/store/useFiltersStore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WholesaleCompanyCard } from "@/components/wholesale/WholesaleCompanyCard"
import { WholesalePageShell } from "@/components/wholesale/WholesalePageShell"
import { WholesaleCompaniesTrustSection } from "@/components/wholesale/WholesaleCompaniesTrustSection.jsx"
import { CategoryBar } from "@/components/home/CategoryBar"
import { FilterToolbar } from "@/components/home/FilterToolbar"
import { getDirection, isRtlLanguage } from "@/lib/direction"
import { ChevronLeft, ChevronRight, Store } from "lucide-react"
import {
  hasWholesaleCompanyFilters,
  resolveWholesaleSupplierCountLabel,
} from "@/lib/wholesaleCompanyFilters"

export function WholesaleCompaniesPage() {
  const { t, i18n } = useTranslation()
  const dir = getDirection(i18n.language)
  const isRTL = isRtlLanguage(i18n.language)
  const CrumbIcon = isRTL ? ChevronLeft : ChevronRight
  const [page, setPage] = useState(1)

  const categoryId = useFiltersStore((s) => s.categoryId)
  const subcategoryId = useFiltersStore((s) => s.subcategoryId)
  const regionId = useFiltersStore((s) => s.regionId)
  const cityId = useFiltersStore((s) => s.cityId)
  const searchQuery = useFiltersStore((s) => s.searchQuery)
  const resetFilters = useFiltersStore((s) => s.resetFilters)
  const setRegion = useFiltersStore((s) => s.setRegion)

  useEffect(() => {
    setPage(1)
  }, [searchQuery, categoryId, subcategoryId, regionId, cityId])

  const params = useMemo(
    () => ({
      search: searchQuery?.trim() || undefined,
      category_id: categoryId ?? undefined,
      subcategory_id: subcategoryId ?? undefined,
      region_id: regionId ?? undefined,
      city_id: cityId ?? undefined,
      per_page: 24,
      page,
    }),
    [searchQuery, categoryId, subcategoryId, regionId, cityId, page]
  )

  const { data, isLoading } = useQuery({
    queryKey: ["wholesale", "companies", params],
    queryFn: () => fetchWholesaleCompanies(params),
  })
  const { data: categories = [], isLoading: categoriesLoading } = useMainCategories()
  const { data: regions = [] } = useRegions()

  useEffect(() => {
    if (!cityId || regionId || !regions.length) return
    const parent = regions.find((r) => r.cities?.some((c) => c.id === cityId))
    if (parent) setRegion(parent.id)
  }, [cityId, regionId, regions, setRegion])

  const companies = data?.data ?? []
  const meta = data?.meta ?? {}
  const total = Number(meta.total ?? companies.length)
  const lastPage = Math.max(1, Number(meta.last_page ?? 1))
  const currentPage = Math.min(lastPage, Math.max(1, Number(meta.current_page ?? page)))

  const hasActiveFilters = hasWholesaleCompanyFilters({
    categoryId,
    subcategoryId,
    regionId,
    cityId,
    searchQuery,
  })

  const supplierCountLabel = resolveWholesaleSupplierCountLabel(t, { total, hasActiveFilters })

  return (
    <section className="min-h-[400px] bg-background pb-10" dir={dir}>
      <WholesalePageShell className="space-y-2 py-3 md:py-4">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            {t("nav.home")}
          </Link>
          <CrumbIcon className="size-4 shrink-0" />
          <Link to="/wholesale" className="hover:text-foreground">
            {t("wholesale.market.title")}
          </Link>
          <CrumbIcon className="size-4 shrink-0" />
          <span className="min-w-0 font-medium text-foreground">{t("wholesale.companies.title")}</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 text-start">
          <h1 className="wholesale-type-display text-balance">{t("wholesale.companies.title")}</h1>
          <p className="text-sm font-semibold tabular-nums text-muted-foreground">{supplierCountLabel}</p>
        </div>
      </WholesalePageShell>

      <CategoryBar categories={categories} isLoading={categoriesLoading} />
      <FilterToolbar
        regions={regions}
        hideWholesaleLink
        hideFeaturedFilter
        showReset
        clearSearchOnEmpty
        inputDir={dir}
        searchPlaceholder={t("wholesale.companies.search")}
      />

      <WholesalePageShell className="space-y-6 py-6 md:py-8">
        {isLoading ? (
          <div className="wholesale-company-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="h-72 animate-pulse rounded-[28px] bg-muted/40" />
            ))}
          </div>
        ) : (
          <div className="wholesale-company-grid">
            {companies.map((company) => (
              <WholesaleCompanyCard key={company.id} company={company} t={t} dir={dir} />
            ))}
          </div>
        )}

        {companies.length === 0 && !isLoading ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="flex flex-col items-center gap-4 py-14 text-center text-sm text-muted-foreground">
              <Store className="size-12 text-muted-foreground/50" aria-hidden />
              <p className="max-w-md text-base font-medium text-foreground">{t("wholesale.companies.empty")}</p>
              <Button type="button" variant="outline" className="rounded-full" onClick={resetFilters}>
                {t("wholesale.filters.clearFiltersCta")}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {lastPage > 1 ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("wholesale.companies.prevPage")}
            </Button>
            <span className="px-2 text-sm text-muted-foreground tabular-nums">
              {t("wholesale.companies.pageIndicator", { current: currentPage, last: lastPage })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= lastPage}
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            >
              {t("wholesale.companies.nextPage")}
            </Button>
          </div>
        ) : null}

        <WholesaleCompaniesTrustSection pageDir={dir} />
      </WholesalePageShell>
    </section>
  )
}
