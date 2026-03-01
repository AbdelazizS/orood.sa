import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { FeedList } from "@/components/feed/FeedList"
import { WholesaleSection } from "@/components/wholesale/WholesaleSection"
import { useHomepageFeed } from "@/hooks/useHomepageFeed"
import { SearchBar } from "@/components/navigation/SearchBar"
import { AddListingButton } from "@/components/sidebar/AddListingButton"
import { CategoryDropdown } from "@/components/filters/CategoryDropdown"
import { SubcategoryDropdown } from "@/components/filters/SubcategoryDropdown"
import { RegionDropdown } from "@/components/filters/RegionDropdown"
import { FilterDropdown } from "@/components/filters/FilterDropdown"
import { ResetFiltersButton } from "@/components/filters/ResetFiltersButton"
import { useFiltersStore } from "@/store/useFiltersStore"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SlidersHorizontal } from "lucide-react"

export function HomePage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { setCategory, setSubcategory } = useFiltersStore()
  const { feedQuery, categoriesQuery, regionsQuery, companiesQuery } = useHomepageFeed()

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

  const FiltersSidebar = () => (
    <div className="space-y-3">
      <SubcategoryDropdown />
      <RegionDropdown regions={regionsQuery.data ?? []} />
      <FilterDropdown />
      <ResetFiltersButton />
    </div>
  )

  return (
    <section className="min-h-[400px] space-y-4 sm:space-y-5">
      {/* Top row: category, search, add listing */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <CategoryDropdown categories={categoriesQuery.data ?? []} isLoading={categoriesQuery.isLoading} />
        <div className="min-w-0 flex-1 sm:min-w-[200px]">
          <SearchBar />
        </div>
        <AddListingButton />
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px,1fr] xl:grid-cols-[320px,1fr]">
        {/* Desktop: sidebar. Mobile: filters sheet trigger */}
        <aside className="order-2 space-y-3 lg:order-1">
          <div className="hidden lg:block">
            <FiltersSidebar />
          </div>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full rounded-2xl lg:hidden" size="lg">
                <SlidersHorizontal className="me-2 size-4" aria-hidden />
                {t("filters.showFilters")}
              </Button>
            </SheetTrigger>
            <SheetContent side="start" className="flex flex-col gap-0 p-0">
              <SheetHeader className="shrink-0 border-b px-4 py-4">
                <SheetTitle className="text-start">{t("filters.showFilters")}</SheetTitle>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <FiltersSidebar />
              </div>
            </SheetContent>
          </Sheet>
        </aside>
        <div className="order-1 min-w-0 space-y-4 lg:order-2">
          <FeedList feedQuery={feedQuery} />
          <WholesaleSection />
        </div>
      </div>
    </section>
  )
}
