import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { FeedList } from "@/components/feed/FeedList"
import { useHomepageFeed } from "@/hooks/useHomepageFeed"
import { FilterToolbar } from "@/components/home/FilterToolbar"
import { CategoryBar } from "@/components/home/CategoryBar"
import { SubcategoryBar } from "@/components/home/SubcategoryBar"
import { AnnouncementStrip } from "@/components/home/AnnouncementStrip"
import { useFiltersStore } from "@/store/useFiltersStore"

export function HomePage() {
  const { setCategory, setSubcategory } = useFiltersStore()
  const [searchParams] = useSearchParams()
  const { feedQuery, categoriesQuery, regionsQuery } = useHomepageFeed()

  useEffect(() => {
    const cat = searchParams.get("category")
    if (cat) {
      const id = Number.parseInt(cat, 10)
      if (!Number.isNaN(id)) {
        setCategory(id)
        setSubcategory(null)
      }
    }
  }, [searchParams, setCategory, setSubcategory])

  const categoriesLoading = categoriesQuery.isLoading
  const categories = categoriesQuery.data ?? []

  return (
    <section className="min-h-[400px] bg-background">
      {/* Section 1 — Categories first (skeleton when loading) */}
      <CategoryBar categories={categories} isLoading={categoriesLoading} />

      {/* Section 2 — Subcategory chips (only when categories loaded) */}
      <SubcategoryBar categories={categories} />

      {/* Section 3 — Filter toolbar */}
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
