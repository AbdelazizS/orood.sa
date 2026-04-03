import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { ProductCard } from "@/components/feed/cards/ProductCard"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"

export function BuyerFavoritesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const { data } = await apiClient.get("/favorites")
      return data ?? {}
    },
  })

  const products = data?.data ?? []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Favorites</h1>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Favorites</h1>
      <div className="grid gap-4 xl:grid-cols-2">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {products.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No favorites yet. Browse the feed and add products you like.
        </p>
      )}
    </div>
  )
}
