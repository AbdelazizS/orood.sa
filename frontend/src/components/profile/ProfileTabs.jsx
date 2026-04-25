import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/feed/cards/ProductCard"
import { ReviewCard } from "@/components/reviews/ReviewCard"
import { StarRating } from "@/components/ui/StarRating"
import { RatingBar } from "@/components/ui/RatingBar"
import { normalizeListingForProductCard } from "@/lib/normalizeProfilePayload"
import { cn } from "@/lib/utils"
import { PUBLIC_PROFILE_CONTAINER } from "@/components/profile/publicProfileLayout"
import { Loader2 } from "lucide-react"

function formatNumber(value, language) {
  return new Intl.NumberFormat(language === "ar" ? "ar-SA" : "en-US").format(Number(value || 0))
}

function RatingSummaryCard({ reviewSummary, direction }) {
  const { t, language } = useTranslation()
  const total = Number(reviewSummary?.total ?? 0)
  const avg = Number(reviewSummary?.average ?? 0)
  const dist = reviewSummary?.distribution ?? {}

  return (
    <div
      className="rounded-lg border bg-card p-4 text-start"
      dir={direction}
    >
      <div className="flex flex-wrap items-center gap-3">
        <StarRating value={avg} readonly size="md" showValue={total > 0} className="text-amber-500" />
        <span className="text-sm text-muted-foreground">
          {t("publicProfile.reviewsCountLabel", { count: formatNumber(total, language), defaultValue: "{{count}} تقييم" })}
        </span>
      </div>
      {total > 0 ? (
        <div className="mt-4">
          <RatingBar distribution={dist} total={total} dir={direction === "rtl" ? "rtl" : "ltr"} />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{t("publicProfile.noReviews")}</p>
      )}
    </div>
  )
}

export function ProfileTabs({
  profileKey,
  user,
  reviewSummary,
  myReview,
  isOwner,
  listingsQuery,
  reviewsQuery,
  onReviewModalOpenChange,
  initialListings = [],
  initialReviews = [],
}) {
  const { t, language } = useTranslation()
  const { direction } = useAppDirection()
  const listingsPages = listingsQuery.data?.pages ?? []
  const listingsFromPages = listingsPages.flatMap((p) => (Array.isArray(p?.listings) ? p.listings : []))
  const listings =
    listingsFromPages.length > 0 ? listingsFromPages : (Array.isArray(initialListings) ? initialListings : [])
  const reviewsPages = reviewsQuery.data?.pages ?? []
  const reviewsFromPages = reviewsPages.flatMap((p) => (Array.isArray(p?.reviews) ? p.reviews : []))
  const reviews =
    reviewsFromPages.length > 0 ? reviewsFromPages : (Array.isArray(initialReviews) ? initialReviews : [])

  const listingsBadge = formatNumber(user?._count?.listings ?? 0, language)
  const reviewsBadge = formatNumber(reviewSummary?.total ?? 0, language)

  const sellerLabel = [user?.username, user?.name].map((s) => (typeof s === "string" ? s.trim() : "")).find(Boolean) || ""

  const listingAsProduct = (listing) => normalizeListingForProductCard(listing, sellerLabel)

  return (
    <Tabs defaultValue="listings" className="w-full" dir={direction}>
      <div
        className={cn(
          "sticky top-14 z-20 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75",
        )}
      >
        <div className={PUBLIC_PROFILE_CONTAINER}>
          <TabsList variant="line" className="h-11 w-full min-w-0 justify-start gap-0 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger
              value="listings"
              className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <span className="flex items-center gap-2">
                {t("publicProfile.listingsTitle")}
                <Badge variant="secondary" className="tabular-nums">
                  {listingsBadge}
                </Badge>
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <span className="flex items-center gap-2">
                {t("publicProfile.reviewsTitle")}
                <Badge variant="secondary" className="tabular-nums">
                  {reviewsBadge}
                </Badge>
              </span>
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      <div className={PUBLIC_PROFILE_CONTAINER}>
        <TabsContent value="listings" className="mt-4 space-y-4 pb-8 focus-visible:outline-none">
              {listingsQuery.isLoading && listings.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
              ) : listings.length === 0 ? (
                <p className="rounded-lg border bg-card p-4 text-start text-sm text-muted-foreground">{t("publicProfile.noListings")}</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  {listings.map((listing) => (
                    <ProductCard key={listing.id} product={listingAsProduct(listing)} />
                  ))}
                </div>
              )}
              {listingsQuery.hasNextPage ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={listingsQuery.isFetchingNextPage}
                  onClick={() => listingsQuery.fetchNextPage()}
                >
                  {listingsQuery.isFetchingNextPage ? (
                    <>
                      <Loader2 className="me-2 size-4 animate-spin" />
                      {t("common.loading")}
                    </>
                  ) : (
                    t("publicProfile.loadMoreListings", "المزيد من الإعلانات")
                  )}
                </Button>
              ) : null}
            </TabsContent>

            <TabsContent value="reviews" className="mt-4 space-y-4 pb-8 focus-visible:outline-none">
              <RatingSummaryCard reviewSummary={reviewSummary} direction={direction} />
              {myReview && !isOwner && onReviewModalOpenChange ? (
                <Button type="button" variant="outline" size="sm" onClick={() => onReviewModalOpenChange(true)}>
                  {t("publicProfile.editMyReview", "تعديل تقييمي")}
                </Button>
              ) : null}
              {reviewsQuery.isLoading && reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
              ) : reviews.length === 0 ? (
                <p className="rounded-lg border bg-card p-4 text-start text-sm text-muted-foreground">{t("publicProfile.noReviews")}</p>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border">
                  {reviews.map((review) => (
                    <div key={review.id} className="px-3">
                      <ReviewCard review={review} showActions={false} showReactions={false} />
                    </div>
                  ))}
                </div>
              )}
              {reviewsQuery.hasNextPage ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={reviewsQuery.isFetchingNextPage}
                  onClick={() => reviewsQuery.fetchNextPage()}
                >
                  {reviewsQuery.isFetchingNextPage ? (
                    <>
                      <Loader2 className="me-2 size-4 animate-spin" />
                      {t("common.loading")}
                    </>
                  ) : (
                    t("publicProfile.loadMoreReviews", "المزيد من التقييمات")
                  )}
                </Button>
              ) : null}
        </TabsContent>
      </div>
    </Tabs>
  )
}
