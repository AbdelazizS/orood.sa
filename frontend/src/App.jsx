import { AppLayout } from "@/components/layout/AppLayout"
import { TopNavigation } from "@/components/navigation/TopNavigation"
import { SecondaryNavigation } from "@/components/navigation/SecondaryNavigation"
import { FeedList } from "@/components/feed/FeedList"
import { useHomepageFeed } from "@/hooks/useHomepageFeed"
import { WholesaleSection } from "@/components/wholesale/WholesaleSection"
import { SearchBar } from "@/components/navigation/SearchBar"
import { AddListingButton } from "@/components/sidebar/AddListingButton"
import { CategoryDropdown } from "@/components/filters/CategoryDropdown"
import { SubcategoryDropdown } from "@/components/filters/SubcategoryDropdown"
import { RegionDropdown } from "@/components/filters/RegionDropdown"
import { FilterDropdown } from "@/components/filters/FilterDropdown"

function App() {
  const { feedQuery, categoriesQuery, regionsQuery, companiesQuery } = useHomepageFeed()

  return (
    <>
      <div className="  border">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        <TopNavigation />
        </div>

      </div>

      <AppLayout>
        <section className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <CategoryDropdown categories={categoriesQuery.data ?? []} isLoading={categoriesQuery.isLoading} />
            <div className="flex-1">
              <SearchBar />
            </div>
            <AddListingButton />
          </div>

          <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
            <div className="space-y-3">
              <SubcategoryDropdown />
              <RegionDropdown regions={regionsQuery.data ?? []} />
              <FilterDropdown />
            </div>
            <div className="space-y-4">
              <FeedList feedQuery={feedQuery} />
            </div>
          </div>
        </section>
      </AppLayout>
    </>
  )
}

export default App
