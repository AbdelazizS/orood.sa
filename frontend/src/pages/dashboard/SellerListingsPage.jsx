import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { PlusCircle, Eye, Package, Pencil, Gavel } from "lucide-react"

export function SellerListingsPage() {
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Listings</h1>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Listings</h1>
        <Button asChild>
          <Link to="/add">
            <PlusCircle className="me-2 size-4" />
            Add Offer/Request
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                <Link to={`/products/${product.id}`} className="hover:underline">
                  {product.title}
                </Link>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {product.price ? `${product.price} SAR` : "Price on request"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="size-3" />
                  {product.stats?.views ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="size-3" />
                  {product.stats?.purchases ?? 0}
                </span>
                {product.accept_bids && (
                  <span className="flex items-center gap-1">
                    <Gavel className="size-3" />
                    {product.stats?.bids ?? 0}
                  </span>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/products/${product.id}`}>View</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/products/${product.id}/edit`}>
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
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No listings yet</p>
            <Button asChild className="mt-4">
              <Link to="/add">
                <PlusCircle className="me-2 size-4" />
                Add your first offer
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
