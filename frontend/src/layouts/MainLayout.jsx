import { Outlet } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { SiteHeader } from "@/components/navigation/SiteHeader"
import { useHomepageFeed } from "@/hooks/useHomepageFeed"

/**
 * Main site layout: header + content.
 * Uses SiteHeader with categories, regions, search.
 */
export function MainLayout() {
  const { categoriesQuery, regionsQuery } = useHomepageFeed()

  return (
    <>
      <SiteHeader
        categories={categoriesQuery.data ?? []}
        regions={regionsQuery.data ?? []}
        isLoading={categoriesQuery.isLoading || regionsQuery.isLoading}
      />
      <AppLayout>
        <Outlet />
      </AppLayout>
    </>
  )
}
