import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { Package, Heart, MessageSquare, PlusCircle } from "lucide-react"

export function DashboardOverviewPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "mine"],
    queryFn: async () => {
      const { data } = await apiClient.get("/products")
      return data?.data ?? []
    },
  })

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const { data } = await apiClient.get("/favorites")
      return data?.data ?? []
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("dashboard.welcome", "Welcome")}, {user?.name}</h1>
        <Skeleton className="h-32" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard.welcome", "Welcome")}, {user?.name}</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.listings")}</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{products.length}</p>
            <Button variant="link" className="p-0 h-auto" asChild>
              <Link to="/dashboard/listings">{t("dashboard.viewAll", "View all")}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.favorites")}</CardTitle>
            <Heart className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{favorites.length}</p>
            <Button variant="link" className="p-0 h-auto" asChild>
              <Link to="/dashboard/favorites">{t("dashboard.viewAll", "View all")}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.messages")}</CardTitle>
            <MessageSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button variant="link" className="p-0 h-auto" asChild>
              <Link to="/dashboard/messages">{t("dashboard.open", "Open")}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.addListing", "Add Listing")}</CardTitle>
            <PlusCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/add">{t("dashboard.addOffer", "Add Offer/Request")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
