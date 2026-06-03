import { useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { FeedList } from "@/components/feed/FeedList"
import { useHomepageFeed } from "@/hooks/useHomepageFeed"
import { FilterToolbar } from "@/components/home/FilterToolbar"
import { CategoryBar } from "@/components/home/CategoryBar"
import { AnnouncementStrip } from "@/components/home/AnnouncementStrip"
import { useFiltersStore } from "@/store/useFiltersStore"
import { SeoHead } from "@/components/seo/SeoHead"
import { useResolvedSeo } from "@/hooks/useResolvedSeo"
import { SITE_URL } from "@/components/seo/SeoHead"
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  mergeJsonLd,
} from "@/lib/seo/structuredData"

function CategoryIntroBlock({ category }) {
  return (
    <div className="border-b border-border bg-muted/30 px-4 py-6 sm:px-6">
      <nav className="mb-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-foreground">
          الرئيسية
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{category.name}</span>
      </nav>
      <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
      {category.description ? (
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground leading-relaxed">{category.description}</p>
      ) : null}
    </div>
  )
}

export function CategoryLandingPage() {
  const { slug } = useParams()
  const { t, i18n } = useTranslation()
  const { setCategory, setSubcategory } = useFiltersStore()
  const { feedQuery, categoriesQuery, regionsQuery } = useHomepageFeed()

  const categoryQuery = useQuery({
    queryKey: ["category-by-slug", slug, i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get(`/categories/by-slug/${slug}`)
      return data?.data ?? data
    },
    enabled: Boolean(slug),
  })

  const category = categoryQuery.data
  const path = `/category/${slug}`

  const seoQuery = useResolvedSeo(path, {
    page_key: category ? `category.${slug}` : undefined,
    title: category?.name,
    description: category?.description,
  })

  const seo = seoQuery.data

  useEffect(() => {
    if (category?.id) {
      setCategory(category.id)
      setSubcategory(null)
    }
  }, [category?.id, setCategory, setSubcategory])

  const jsonLd = category
    ? mergeJsonLd(
        buildCollectionPageSchema({
          url: `${SITE_URL}${path}`,
          name: category.name,
          description: seo?.description ?? "",
        }),
        buildBreadcrumbSchema([
          { name: t("nav.home", "الرئيسية"), url: `${SITE_URL}/` },
          { name: category.name, url: `${SITE_URL}${path}` },
        ])
      )
    : null

  return (
    <section className="min-h-[400px] bg-background">
      <SeoHead
        path={path}
        title={seo?.seo_title ?? category?.name}
        description={seo?.description}
        image={seo?.og?.image}
        keywords={seo?.keywords}
        jsonLd={jsonLd}
        hreflang={seo?.hreflang}
        useTitleAsFull={Boolean(seo?.title)}
      />

      {category ? <CategoryIntroBlock category={category} /> : null}

      <CategoryBar categories={categoriesQuery.data ?? []} isLoading={categoriesQuery.isLoading} />
      <FilterToolbar regions={regionsQuery.data ?? []} />
      <AnnouncementStrip target="individuals" queryKey={`category-${slug}`} />
      <div className="space-y-0">
        <FeedList feedQuery={feedQuery} />
      </div>
    </section>
  )
}
