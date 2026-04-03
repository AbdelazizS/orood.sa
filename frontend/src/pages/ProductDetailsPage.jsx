import { useEffect } from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { useAppDirection } from "@/providers/DirectionProvider"
import {
  ListingHeaderBar,
  ListingPriceRow,
  ListingTitle,
  ListingImages,
  ListingDescription,
  PublisherInfoNote,
  ListingActions,
  CommentsSection,
  ListingStatsRow,
  ShippingInfo,
  TrustBanner,
} from "@/components/listing-detail"
import { SimilarProductsSection } from "@/features/offers/SimilarProductsSection"

/**
 * Product/Listing detail page — exact layout per PDF pages 7-11.
 * Section order: 1 Header → 2 Price → 3 Title → 4 Images → 5 Description
 * → 6 Publisher note → 7 Actions → 8 Comments → 9 Stats → 10 Shipping → 11 Trust
 */
export function ProductDetailsPage() {
  const { id } = useParams()
  const { direction } = useAppDirection()
  const { user, token } = useAuthStore()

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/products/${id}`)
      return data?.data
    },
    enabled: Boolean(id),
  })

  const isOwner = token && (user?.id === product?.seller?.id || user?.id === product?.user_id)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  if (isLoading || !product) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 pb-24 pt-6 sm:px-6">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="aspect-video w-full" />
        </div>
      </div>
    )
  }

  return (
    <div dir={direction} className="min-h-screen bg-background">
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-24 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main content — product details card */}
        <article className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <ListingHeaderBar product={product} />
          <ListingPriceRow product={product} />
          <ListingTitle product={product} />
          <ListingImages product={product} />
          <ListingDescription product={product} />
          <PublisherInfoNote product={product} />
          {!isOwner && <ListingActions product={product} />}
          <ListingStatsRow product={product} />
          <CommentsSection product={product} />
          <ShippingInfo product={product} />
          <TrustBanner />
        </article>

        {/* Sidebar — similar products */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <SimilarProductsSection product={product} variant="sidebar" />
          </div>
        </aside>
      </main>
    </div>
  )
}
