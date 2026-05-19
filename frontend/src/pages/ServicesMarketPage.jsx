import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { fetchServiceCategories, fetchServiceProviders } from "@/services/servicesMarketService"
import { WholesalePageShell } from "@/components/wholesale/WholesalePageShell"
import { ServiceProviderCard } from "@/components/services/ServiceProviderCard"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getDirection } from "@/lib/direction"

export function ServicesMarketPage() {
  const { t, i18n } = useTranslation()
  const dir = getDirection(i18n.language)
  const [search, setSearch] = useState("")
  const [submittedSearch, setSubmittedSearch] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [sort, setSort] = useState("rating")
  const [page, setPage] = useState(1)

  const params = useMemo(
    () => ({
      search: submittedSearch || undefined,
      category_id: categoryId || undefined,
      sort,
      per_page: 24,
      page,
    }),
    [submittedSearch, categoryId, sort, page]
  )

  const categoriesQuery = useQuery({
    queryKey: ["services", "categories"],
    queryFn: fetchServiceCategories,
  })

  const providersQuery = useQuery({
    queryKey: ["services", "providers", params],
    queryFn: () => fetchServiceProviders(params),
  })

  const providers = providersQuery.data?.data ?? []
  const meta = providersQuery.data?.meta ?? {}
  const lastPage = Math.max(1, Number(meta.last_page ?? 1))
  const currentPage = Math.min(lastPage, Math.max(1, Number(meta.current_page ?? page)))

  return (
    <section className="min-h-[400px] bg-background pb-10 pt-4 md:pt-6" dir={dir}>
      <WholesalePageShell className="space-y-6">
        <div className="space-y-2 text-start">
          <h1 className="wholesale-type-display">{t("services.market.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("services.market.subtitle")}</p>
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link to="/dashboard/services">{t("services.market.providerDashboard")}</Link>
          </Button>
        </div>

        <Card className="rounded-2xl border-border/60">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSubmittedSearch(search.trim())
                  setPage(1)
                }
              }}
              placeholder={t("services.market.search")}
              dir={dir}
            />
            <Select
              value={categoryId || "all"}
              onValueChange={(v) => {
                setCategoryId(v === "all" ? "" : v)
                setPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("services.market.category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("services.market.allCategories")}</SelectItem>
                {(categoriesQuery.data ?? []).map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">{t("services.market.sortRating")}</SelectItem>
                <SelectItem value="newest">{t("services.market.sortNewest")}</SelectItem>
                <SelectItem value="price_asc">{t("services.market.sortPriceAsc")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={() => {
                setSubmittedSearch(search.trim())
                setPage(1)
              }}
            >
              {t("feed.search")}
            </Button>
          </CardContent>
        </Card>

        {providersQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-48 animate-pulse rounded-2xl bg-muted/40" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {providers.map((provider) => (
              <ServiceProviderCard key={provider.id} provider={provider} t={t} dir={dir} />
            ))}
          </div>
        )}

        {providers.length === 0 && !providersQuery.isLoading ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
              <p>{t("services.market.empty")}</p>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setSearch("")
                  setSubmittedSearch("")
                  setCategoryId("")
                  setPage(1)
                }}
              >
                {t("wholesale.filters.clearFiltersCta")}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {lastPage > 1 ? (
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              {t("wholesale.companies.prevPage")}
            </Button>
            <span className="self-center text-sm text-muted-foreground tabular-nums">
              {t("wholesale.companies.pageIndicator", { current: currentPage, last: lastPage })}
            </span>
            <Button variant="outline" size="sm" disabled={currentPage >= lastPage} onClick={() => setPage((p) => Math.min(lastPage, p + 1))}>
              {t("wholesale.companies.nextPage")}
            </Button>
          </div>
        ) : null}
      </WholesalePageShell>
    </section>
  )
}
