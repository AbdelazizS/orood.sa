import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { FeedList } from "@/components/feed/FeedList"
import { useHomepageFeed } from "@/hooks/useHomepageFeed"
import { FilterToolbar } from "@/components/home/FilterToolbar"
import { CategoryBar } from "@/components/home/CategoryBar"
import { SubcategoryBar } from "@/components/home/SubcategoryBar"
import { AnnouncementStrip } from "@/components/home/AnnouncementStrip"
import { useFiltersStore } from "@/store/useFiltersStore"
import { SeoHead } from "@/components/seo/SeoHead"
import { usePageSeo } from "@/hooks/usePageSeo"
import { useResolvedSeo } from "@/hooks/useResolvedSeo"
import { mergeJsonLd, buildOrganizationSchema, buildWebSiteSchema } from "@/lib/seo/structuredData"

export function HomePage() {
  const { setCategory, setSubcategory, setSearchQuery } = useFiltersStore()
  const [searchParams] = useSearchParams()
  const { feedQuery, categoriesQuery, regionsQuery } = useHomepageFeed()
  const fallbackSeo = usePageSeo("home")
  const resolvedSeo = useResolvedSeo("/", {}, { enabled: true })
  const seo = resolvedSeo.data

  useEffect(() => {
    const q = searchParams.get("q")
    if (q) setSearchQuery(q)
  }, [searchParams, setSearchQuery])

  useEffect(() => {
    const categories = categoriesQuery.data ?? []
    if (!categories.length) return

    const catSlug = searchParams.get("cat")
    if (catSlug) {
      const bySlug = categories.find((c) => c.slug === catSlug)
      if (bySlug) {
        setCategory(bySlug.id)
        setSubcategory(null)
      }
      return
    }

    const cat = searchParams.get("category")
    if (!cat) return
    const id = Number.parseInt(cat, 10)
    if (Number.isNaN(id)) return
    setCategory(id)
    setSubcategory(null)
  }, [searchParams, categoriesQuery.data, setCategory, setSubcategory])

  const categoriesLoading = categoriesQuery.isLoading
  const categories = categoriesQuery.data ?? []

  const homeJsonLd = mergeJsonLd(buildWebSiteSchema(), buildOrganizationSchema())

  return (
    <section className="min-h-[400px] bg-background">
      <SeoHead
        path="/"
        title={seo?.seo_title ?? fallbackSeo.title}
        description={seo?.description ?? fallbackSeo.description}
        keywords={seo?.keywords}
        hreflang={seo?.hreflang}
        jsonLd={seo?.json_ld?.length ? seo.json_ld : homeJsonLd}
        useTitleAsFull={Boolean(seo?.title)}
      />
      {/* Section 1 — Categories first (skeleton when loading) */}
      <CategoryBar categories={categories} isLoading={categoriesLoading} />
      <SubcategoryBar categories={categories} />

      {/* Section 2 — Filter toolbar */}
      <FilterToolbar regions={regionsQuery.data ?? []} />

      {/* Section 4 — Announcement strip */}
      <AnnouncementStrip target="individuals" queryKey="home-individuals" />

      {/* Section 5 — Listings feed */}
      <div className="space-y-0">
        <FeedList feedQuery={feedQuery} />
      </div>
    </section>
  )
}
