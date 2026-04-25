import { useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { useAppDirection } from "@/providers/DirectionProvider"
import {
  ListingDetailHeroSection,
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
import { ViewRequestsSellerPanel } from "@/components/listing-detail/ViewRequestsSellerPanel"
import { BidSection } from "@/features/offers/BidSection"
import { SimilarProductsSection } from "@/features/offers/SimilarProductsSection"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useTranslation } from "react-i18next"

/**
 * Product/Listing detail page — exact layout per PDF pages 7-11.
 * Section order: 1–2 Hero (seller + price/stats) → 3 Title → 4 Images → 5 Description
 * → 6 Publisher note → 7 Actions → 8 Comments → 9 Stats → 10 Shipping → 11 Trust
 */
export function ProductDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { direction } = useAppDirection()
  const { user, token } = useAuthStore()
  const viewTrackedRef = useRef(false)

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id, i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get(`/listings/${id}`)
      return data?.data
    },
    enabled: Boolean(id),
  })

  const isOwner = token && (user?.id === product?.seller?.id || user?.id === product?.user_id)

  useEffect(() => {
    if (!id || !product?.id || isOwner || viewTrackedRef.current) return
    viewTrackedRef.current = true
    apiClient.post(`/products/${id}/view`, {
      platform: "web",
      source: "product_details",
    }).catch(() => {})
  }, [id, product?.id, isOwner])

  if (isLoading || !product) {
    return (
      <div dir={direction} className="min-h-screen bg-background">
        <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-24 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,430px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,470px)]">
          <article className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center border-b border-border px-2 py-2 sm:px-4">
              <Skeleton className="h-11 w-24 rounded-md" />
            </div>

            {/* Hero */}
            <div className="space-y-3 border-b border-border px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-44" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="size-10 rounded-full" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>

            {/* Title + media */}
            <div className="space-y-4 border-b border-border px-4 py-4">
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-16 w-16 rounded-md" />
                <Skeleton className="h-16 w-16 rounded-md" />
                <Skeleton className="h-16 w-16 rounded-md" />
              </div>
            </div>

            {/* Remaining sections */}
            <div className="space-y-4 px-4 py-4">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-18 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </article>

          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
              <Skeleton className="mb-4 h-5 w-32" />
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            </div>
          </aside>
        </main>
      </div>
    )
  }

  return (
    <div dir={direction} className="min-h-screen bg-background">
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-24 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,430px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,470px)]">
        {/* Main content — product details card */}
        <article className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center border-b border-border px-2 py-2 sm:px-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 min-h-[44px] text-base"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
              {t("common.back", "رجوع")}
            </Button>
          </div>
          <ListingDetailHeroSection product={product} />
          <ListingTitle product={product} />
          <ListingImages product={product} />
          <ListingDescription product={product} />
          <PublisherInfoNote product={product} />
          {!isOwner && <ListingActions product={product} />}
          {!isOwner && <BidSection product={product} />}
          <CommentsSection product={product} />
          <ListingStatsRow product={product} />
          <ShippingInfo product={product} />
          <TrustBanner />
          {isOwner ? (
            <ViewRequestsSellerPanel productId={product?.id ?? id} enabled={Boolean(isOwner && (product?.id ?? id))} />
          ) : null}
        </article>

        {/* Sidebar — similar products */}
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <SimilarProductsSection product={product} variant="sidebar" />
          </div>
        </aside>
      </main>
    </div>
  )
}
