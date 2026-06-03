import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { FeedList } from "@/components/feed/FeedList"
import { useHomepageFeed } from "@/hooks/useHomepageFeed"
import { FilterToolbar } from "@/components/home/FilterToolbar"
import { CategoryBar } from "@/components/home/CategoryBar"
import { SubcategoryBar } from "@/components/home/SubcategoryBar"
import { SeoHead } from "@/components/seo/SeoHead"
import { usePageSeo } from "@/hooks/usePageSeo"
import { useResolvedSeo } from "@/hooks/useResolvedSeo"
import { useFiltersStore } from "@/store/useFiltersStore"

export function RequestsPage() {
  const { t } = useTranslation()
  const fallbackSeo = usePageSeo("requests", {
    title: t("seo.routes.requests.title", "طلبات الشراء"),
    description: t("seo.routes.requests.description", "تصفح طلبات الشراء على منصة عروض"),
  })
  const resolved = useResolvedSeo("/requests")
  const seo = resolved.data ?? fallbackSeo
  const { setListingType } = useFiltersStore()
  const { feedQuery, categoriesQuery, regionsQuery } = useHomepageFeed()

  useEffect(() => {
    setListingType("request")
    return () => setListingType(null)
  }, [setListingType])

  return (
    <section className="min-h-[400px] bg-background">
      <SeoHead
        path="/requests"
        title={seo.seo_title ?? seo.title}
        description={seo.description}
        image={seo?.og?.image}
        hreflang={seo.hreflang}
        useTitleAsFull={Boolean(seo.seo_title)}
      />
      <CategoryBar categories={categoriesQuery.data ?? []} isLoading={categoriesQuery.isLoading} />
      <SubcategoryBar categories={categoriesQuery.data ?? []} />
      <FilterToolbar regions={regionsQuery.data ?? []} />
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <h1 className="text-2xl font-bold">{t("seo.routes.requests.title", "طلبات الشراء")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("seo.routes.requests.description", "تصفح طلبات الشراء على منصة عروض")}
        </p>
      </div>
      <FeedList feedQuery={feedQuery} />
    </section>
  )
}
