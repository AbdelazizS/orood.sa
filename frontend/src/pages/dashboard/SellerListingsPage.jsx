import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { useAppDirection } from "@/providers/DirectionProvider"
import { PlusCircle, Eye, Package, Pencil, Gavel } from "lucide-react"

export function SellerListingsPage() {
  const { t, i18n } = useTranslation()
  const { direction } = useAppDirection()
  const priceLocale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US"

  const { data, isLoading } = useQuery({
    queryKey: ["products", "mine"],
    queryFn: async () => {
      const { data } = await apiClient.get("/products")
      return data ?? {}
    },
  })

  const products = data?.data ?? []

  if (isLoading) {
    return (
      <div className="space-y-6" dir={direction}>
        <h1 className="text-2xl font-bold text-start">{t("dashboard.listings")}</h1>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={direction}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-start">{t("dashboard.listings")}</h1>
        <Button asChild className="self-start sm:self-center">
          <Link to="/add">
            <PlusCircle className="me-2 size-4" />
            {t("dashboard.addOffer")}
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader className="pb-2 text-start">
              <CardTitle className="text-base">
                <Link to={`/products/${product.id}`} className="hover:underline break-words">
                  {product.title}
                </Link>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {product.price != null
                  ? `${Number(product.price).toLocaleString(priceLocale)} ${t("common.currency")}`
                  : t("feed.priceOnRequest")}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="size-3 shrink-0" />
                  {product.stats?.views ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="size-3 shrink-0" />
                  {product.stats?.purchases ?? 0}
                </span>
                {product.accept_bids && (
                  <span className="flex items-center gap-1">
                    <Gavel className="size-3 shrink-0" />
                    {product.stats?.bids ?? 0}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/products/${product.id}`}>{t("dashboard.open")}</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/products/${product.id}/edit`} aria-label={t("addOffer.editTitle")}>
                    <Pencil className="size-3" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {products.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">{t("dashboard.listingsPage.emptyNoListings")}</p>
            <Button asChild className="mt-4">
              <Link to="/add">
                <PlusCircle className="me-2 size-4" />
                {t("dashboard.listingsPage.addListing")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
