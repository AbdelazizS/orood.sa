import { useMemo } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useProfile, useProfileListings, useProfileReviews } from "@/hooks/useProfile"
import { useTranslation } from "@/hooks/useTranslation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton"
import { MapPin, ShieldCheck, Star } from "lucide-react"

function formatDate(value, language) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

function formatNumber(value, language) {
  return new Intl.NumberFormat(language === "ar" ? "ar-SA" : "en-US").format(Number(value || 0))
}

export function PublicProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { t, language, direction } = useTranslation()
  const dir = direction

  const hasValidUsername =
    typeof username === "string" &&
    username.trim() !== "" &&
    username !== "undefined" &&
    username !== "null"

  if (!hasValidUsername) {
    return (
      <div dir={dir} className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center p-8">
          <h2 className="mb-2 text-lg font-semibold">{t("profile.not_found")}</h2>
          <p className="text-muted-foreground">{t("profile.user_not_exist")}</p>
        </div>
      </div>
    )
  }

  const profileQuery = useProfile(username)
  const listingsQuery = useProfileListings(username)
  const reviewsQuery = useProfileReviews(username)

  if (profileQuery.isLoading) return <ProfileSkeleton />
  if (profileQuery.isError) {
    return (
      <div dir={dir} className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center p-8">
          <h2 className="mb-2 text-lg font-semibold">{t("profile.error_title")}</h2>
          <p className="mb-4 text-muted-foreground">{profileQuery.error?.message || t("profile.error_message")}</p>
          <Button onClick={() => profileQuery.refetch()}>{t("profile.retry")}</Button>
        </div>
      </div>
    )
  }

  if (!profileQuery.data?.user) {
    return (
      <div dir={dir} className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center p-8">
          <h2 className="mb-2 text-lg font-semibold">{t("profile.not_found")}</h2>
          <p className="text-muted-foreground">{t("profile.user_not_exist")}</p>
        </div>
      </div>
    )
  }

  const user = profileQuery.data.user || null
  const reviewSummary = profileQuery.data.review_summary ?? {}
  const listingsFromProfile = Array.isArray(profileQuery.data?.listings) ? profileQuery.data.listings : []
  const listingsFromPages = listingsQuery.data?.pages?.flatMap((page) => (Array.isArray(page) ? page : [])) ?? []
  const listings = listingsFromPages.length ? listingsFromPages : listingsFromProfile
  const reviewsFromProfile = Array.isArray(profileQuery.data?.reviews) ? profileQuery.data.reviews : []
  const reviews = Array.isArray(reviewsQuery.data) && reviewsQuery.data.length ? reviewsQuery.data : reviewsFromProfile

  const memberSince = useMemo(() => {
    if (!user.member_since) return null
    const year = Number(user.member_since)
    return Number.isNaN(year)
      ? user.member_since
      : new Intl.NumberFormat(language === "ar" ? "ar-SA" : "en-US").format(year)
  }, [language, user.member_since])

  return (
    <div dir={dir} className="min-h-screen bg-muted/30">
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              {t("nav.home")}
            </Link>
            <span>›</span>
            <span className="text-foreground">{t("nav.profile")}</span>
          </nav>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-5 p-4 pb-16">
        <div className="relative h-44 overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 sm:h-56">
          {user.cover_url ? (
            <img src={user.cover_url} alt={t("publicProfile.coverAlt")} className="h-full w-full object-cover" />
          ) : null}
        </div>

        <div className="-mt-14 flex items-end justify-between px-2">
          <div className="flex items-end gap-3">
            <Avatar className="h-24 w-24 border-4 border-background">
              <AvatarImage src={user.avatar_url} alt={user.username} />
              <AvatarFallback className="text-2xl">{(user.username || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{user.username}</h1>
                {user.is_verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    <ShieldCheck className="h-3 w-3" />
                    {t("publicProfile.verified")}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {user.city ? (
                  <>
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{user.city}</span>
                  </>
                ) : null}
                {memberSince ? <span>{t("publicProfile.memberSince", { year: memberSince })}</span> : null}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            {t("publicProfile.backHome")}
          </Button>
        </div>

        {user.bio ? (
          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">{t("publicProfile.about")}</h2>
            <p className="text-sm text-muted-foreground">{user.bio}</p>
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{t("publicProfile.stats.rating")}</p>
            <p className="mt-1 flex items-center gap-1 text-lg font-semibold">
              <Star className="h-4 w-4 text-amber-500" />
              {formatNumber(reviewSummary.average ?? user.rating, language)}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{t("publicProfile.stats.reviews")}</p>
            <p className="mt-1 text-lg font-semibold">
              {formatNumber(reviewSummary.total ?? user.total_ratings ?? 0, language)}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{t("publicProfile.stats.completedOrders")}</p>
            <p className="mt-1 text-lg font-semibold">{formatNumber(user.completed_orders ?? 0, language)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{t("publicProfile.stats.listings")}</p>
            <p className="mt-1 text-lg font-semibold">{formatNumber(user._count?.listings ?? 0, language)}</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("publicProfile.listingsTitle")}</h2>
          {listingsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : listings.length === 0 ? (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{t("publicProfile.noListings")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <article key={listing.id} className="overflow-hidden rounded-lg border bg-card">
                  <div className="aspect-[4/3] bg-muted">
                    {listing.thumbnail ? (
                      <img src={listing.thumbnail} alt={listing.title} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="space-y-1 p-3">
                    <h3 className="line-clamp-1 text-sm font-semibold">{listing.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {listing.price != null
                        ? `${formatNumber(listing.price, language)} ${t("common.currency")}`
                        : t("feed.priceOnRequest")}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled
            >
              {t("publicProfile.prev")}
            </Button>
            <Button
              variant="outline"
              disabled={!listingsQuery.hasNextPage || listingsQuery.isFetchingNextPage}
              onClick={() => listingsQuery.fetchNextPage()}
            >
              {t("publicProfile.next")}
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("publicProfile.reviewsTitle")}</h2>
          {reviewsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : reviews.length === 0 ? (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{t("publicProfile.noReviews")}</p>
          ) : (
            <div className="space-y-2">
              {reviews.map((review) => (
                <article key={review.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{review.reviewer?.username || t("publicProfile.unknownUser")}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(review.created_at, language)}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("publicProfile.ratingValue", { value: formatNumber(review.rating, language) })}
                  </p>
                  <p className="mt-2 text-sm">{review.comment || "-"}</p>
                </article>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" disabled>
              {t("publicProfile.prev")}
            </Button>
            <Button variant="outline" disabled>
              {t("publicProfile.next")}
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
