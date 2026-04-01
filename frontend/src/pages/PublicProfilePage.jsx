import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useProfile, useProfileListings, useProfileReviews } from "@/hooks/useProfile"
import { useAuthStore } from "@/store/useAuthStore"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { StarRating } from "@/components/ui/StarRating"
import { RatingBar } from "@/components/ui/RatingBar"
import { ReviewCard } from "@/components/reviews/ReviewCard"
import { LeaveReviewModal } from "@/components/reviews/LeaveReviewModal"
import { ExpandableText } from "@/components/ui/ExpandableText"
import { Separator } from "@/components/ui/separator"
import { ProfileTopNav } from "@/components/profile/ProfileTopNav"
import { VisitorStatsCard } from "@/components/profile/VisitorStatsCard"
import { ReportsCard } from "@/components/profile/ReportsCard"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { resolveImageUrl } from "@/lib/imageUrl"
import { formatRelativeTime } from "@/lib/dashboardUtils"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Share2,
  Camera,
  MessageCircle,
  Star,
  Pencil,
  MapPin,
  List,
  CheckCircle,
  Calendar,
  Building,
  ImageIcon,
  Eye,
  Plus,
  ArrowUp,
  RefreshCw,
  Trash2,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react"
import apiClient from "@/lib/apiClient"

function ProfilePageSkeleton({ direction = "rtl" }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8" dir={direction}>
      <Skeleton className="h-40 w-full sm:h-48" />
      <div className="-mt-10 flex items-end justify-between px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-16 w-16 rounded-full border-4 border-background sm:h-24 sm:w-24" />
        <div className="mb-1 flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="mt-3 space-y-2 px-4 sm:px-6 lg:px-8">
        <Skeleton className="me-auto h-6 w-40 rtl:ms-auto rtl:me-0" />
        <Skeleton className="me-auto h-4 w-28 rtl:ms-auto rtl:me-0" />
      </div>
      <div className="mt-4 px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <div className="mt-4 space-y-3 px-4 sm:px-6 lg:px-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 rounded-xl border border-border p-3 rtl:flex-row-reverse">
            <Skeleton className="h-20 w-24 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="me-auto h-4 w-3/4 rtl:ms-auto rtl:me-0" />
              <Skeleton className="me-auto h-3 w-1/2 rtl:ms-auto rtl:me-0" />
              <Skeleton className="me-auto h-5 w-16 rtl:ms-auto rtl:me-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PublicProfilePage() {
  const { id, username } = useParams()
  const identifier = id ?? username
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user: me } = useAuthStore()
  const { direction } = useAppDirection()
  const { data, isLoading, isError, error, refetch } = useProfile(identifier)
  const [activeTab, setActiveTab] = useState("listings")
  const [reviewModal, setReviewModal] = useState(false)
  const [editReview, setEditReview] = useState(null)
  const [listingsPage, setListingsPage] = useState(1)
  const [reviewsPage, setReviewsPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: listingsData } = useProfileListings(identifier, listingsPage)
  const { data: reviewsData } = useProfileReviews(identifier, reviewsPage)

  const handleShare = async () => {
    const url = window.location.href
    const text = `تفضل بزيارة صفحة ${data?.user?.username} على عروض`
    if (navigator.share) {
      try {
        await navigator.share({ title: data?.user?.username, text, url })
      } catch (_) {}
    } else {
      await navigator.clipboard.writeText(url)
      toast.success("تم نسخ رابط الصفحة")
    }
  }

  const handleDeleteReview = (id) => {
    apiClient.delete(`/reviews/${id}`).then(() => {
      queryClient.invalidateQueries({ queryKey: ["profile", identifier] })
      queryClient.invalidateQueries({ queryKey: ["profile-reviews", identifier] })
    })
  }

  const handleBump = (id) => {
    apiClient.post(`/products/${id}/bump`).then(() => {
      queryClient.invalidateQueries({ queryKey: ["profile", identifier] })
      queryClient.invalidateQueries({ queryKey: ["profile-listings", identifier] })
    })
  }

  const handleReact = (reviewId, type) => {
    apiClient
      .post(`/reviews/${reviewId}/react`, {
        type: type || null,
      })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["profile-reviews", identifier] })
      })
  }

  const handleDeleteAccount = () => {
    const endpoint = "/account"
    apiClient.delete(endpoint).then(
      () => {
        toast.success("تم حذف الحساب")
        useAuthStore.getState().logout()
        navigate("/")
      },
      (err) => {
        toast.error(err?.response?.data?.message ?? "فشل حذف الحساب")
      }
    )
  }

  const profileData = data?.user ? data : data?.data
  const user = profileData?.user

  if (isLoading || (!user && !isError)) {
    return (
      <div className="min-h-screen bg-muted/30 pb-20" dir={direction}>
        <ProfilePageSkeleton direction={direction} />
      </div>
    )
  }

  if (isError) {
    const errMsg = error?.response?.data?.message ?? error?.message ?? ""
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-muted-foreground">حدث خطأ في تحميل الصفحة</p>
        {errMsg && (
          <p className="max-w-md text-center text-xs text-muted-foreground">{errMsg}</p>
        )}
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          إعادة المحاولة
        </Button>
      </div>
    )
  }

  const { review_summary, company, my_review } = profileData
  const isOwner = user?.is_owner ?? false
  const listings = listingsData?.listings ?? profileData?.listings ?? []
  const reviews = reviewsData?.reviews ?? profileData?.reviews ?? []

  return (
    <div className="min-h-screen bg-muted/30 pb-20" dir={direction}>
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* 1. Header with breadcrumbs */}
        <ProfileTopNav
          isOwner={isOwner}
          username={user.username}
          profileUrl={id ? `/users/${id}` : `/profile/${user.username}`}
          onShare={handleShare}
          onReport={() => {}}
          onEdit={() => navigate("/dashboard/profile")}
          onDelete={() => setDeleteDialogOpen(true)}
        />

        {/* 2. Cover + Avatar Header — full bleed within container */}
        <div className="relative -mx-4 mt-4 sm:-mx-6 lg:-mx-8">
          <div className="relative h-44 overflow-hidden bg-muted sm:h-52">
            {user.cover_url ? (
              <img src={resolveImageUrl(user.cover_url)} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/15 to-primary/5" />
            )}
            {isOwner && (
              <button
                onClick={() => navigate("/dashboard/profile")}
                className="absolute bottom-3 end-3 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs text-white transition-colors hover:bg-black/60"
              >
                <Camera size={11} /> تغيير الغلاف
              </button>
            )}
          </div>

          <div className="-mt-12 flex items-end justify-between px-4 sm:px-6 lg:px-8">
            <div className="relative">
              <div
                className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted sm:h-20 sm:w-20"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
              >
                {user.avatar_url ? (
                  <img src={resolveImageUrl(user.avatar_url)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-primary sm:text-2xl">
                    {(user.username ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {user.is_online && (
                <span className="absolute bottom-0.5 end-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-green-500" />
              )}
            </div>
            <div className="mb-1 flex gap-2">
              {!isOwner && me && (
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => navigate(`/dashboard/messages?to=${user.id}`)}
                >
                  <MessageCircle size={13} /> تواصل معي
                </Button>
              )}
              {isOwner && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => navigate("/dashboard/profile")}
                >
                  <Pencil size={13} /> تعديل الملف
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 px-4 text-start sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-end gap-2 rtl:justify-start">
              {user.is_verified && (
                <Badge className="gap-1 text-xs">
                  <ShieldCheck size={11} /> موثق
                </Badge>
              )}
              {user.financial_guarantee > 0 && (
                <Badge variant="outline" className="gap-1 border-primary text-xs text-primary">
                  <BadgeCheck size={11} /> ضمان مالي
                </Badge>
              )}
              <h1 className="text-xl font-bold text-foreground">{user.username}</h1>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-end gap-3 rtl:justify-start">
              {!user.is_online && user.last_seen_human && (
                <span className="text-xs text-muted-foreground">
                  آخر ظهور {user.last_seen_human}
                </span>
              )}
              {user.is_online && (
                <span className="text-xs font-medium text-green-600">متصل الآن</span>
              )}
              {user.city && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <MapPin size={11} />
                  {user.city}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Stats Bar + Trust Badges + Bio + Company + Owner Toolbar — unified card */}
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-4 divide-x divide-border rtl:divide-x-reverse">
            {[
              {
                label: "التقييم",
                value: user.rating > 0 ? user.rating.toFixed(1) : "—",
                icon: <Star size={15} className="fill-yellow-400 text-yellow-400" />,
                sub: user.total_ratings > 0 ? `${user.total_ratings} تقييم` : null,
              },
              { label: "الطلبات المكتملة", value: user.completed_orders ?? 0, icon: <CheckCircle size={15} /> },
              { label: "العروض", value: user._count?.listings ?? 0, icon: <List size={15} /> },
              { label: "عضو منذ", value: user.member_since ?? "—", icon: <Calendar size={15} /> },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center px-4 py-3 text-center">
                <span className="mb-1 text-muted-foreground">{stat.icon}</span>
                <span className="text-xl font-bold leading-none text-foreground">
                  {stat.value}
                </span>
                {stat.sub && (
                  <span className="mt-0.5 text-xs text-muted-foreground">{stat.sub}</span>
                )}
                <span className="mt-0.5 text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2 border-t border-border px-4 py-2 sm:px-6 lg:px-8">
            {user.is_verified && (
              <Badge variant="outline" className="px-4 py-2 text-xs">
                توثيق ✓
              </Badge>
            )}
            {user.financial_guarantee > 0 && (
              <Badge variant="outline" className="px-4 py-2 text-xs">
                ضمان مالي ✓
              </Badge>
            )}
            {!user.is_online && user.last_seen_human && (
              <Badge variant="outline" className="px-4 py-2 text-xs">
                آخر ظهور قبل {user.last_seen_human}
              </Badge>
            )}
            {user.city && (
              <Badge variant="outline" className="px-4 py-2 text-xs">
                {user.city}
              </Badge>
            )}
          </div>

          {/* 4. Bio */}
          {user.bio && (
            <div className="px-4 py-4 sm:px-6 lg:px-8">
              <p className="mb-1.5 text-xs text-muted-foreground">نبذة عني</p>
              <div className="text-sm text-foreground leading-relaxed">
                <ExpandableText text={user.bio} maxLength={180} />
              </div>
              <Separator className="mt-3" />
            </div>
          )}

          {/* 5. Map — only if location exists */}
          {user.location_lat && user.location_lng && (
            <div className="px-4 sm:px-6 lg:px-8 pb-4">
              <div className="h-40 overflow-hidden rounded-xl border border-border">
                <iframe
                  title="موقع المستخدم"
                  src={`https://www.google.com/maps?q=${user.location_lat},${user.location_lng}&output=embed`}
                  className="h-full w-full"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Company — optional */}
          {company && (
            <div className="px-4 sm:px-6 lg:px-8 pb-4">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 text-start rtl:text-end rtl:flex-row-reverse">
                <div className="flex-1">
                  <div className="flex items-center justify-end gap-1.5 rtl:justify-start">
                    {company.is_verified && <Star size={13} className="text-primary" />}
                    <span className="text-sm font-semibold">{company.name}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {company.city} · {company.product_types}
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Building size={18} className="text-primary" />
                </div>
              </div>
            </div>
          )}

          {/* 6. Owner Toolbar */}
          {isOwner && (
          <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3 sm:px-6 lg:px-8 justify-end rtl:justify-start">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => navigate("/dashboard/profile")}
              asChild
            >
              <Link to="/dashboard/profile">
                <Pencil size={13} /> تعديل
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["profile", identifier] })
                queryClient.invalidateQueries({ queryKey: ["profile-listings", identifier] })
                toast.success("تم التحديث")
              }}
            >
              <RefreshCw size={13} /> تحديث
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 size={13} /> حذف الحساب
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={handleShare}
            >
              <Share2 size={13} /> مشاركة
            </Button>
          </div>
        )}
        </div>

        {/* 5. Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-card backdrop-blur-sm sm:-mx-6 lg:-mx-8">
            <TabsList className="h-auto w-full rounded-none border-0 bg-transparent p-0 px-4 sm:px-6 lg:px-8">
              <TabsTrigger
                value="listings"
                className={cn(
                  "flex-1 rounded-none border-b-2 border-transparent py-3 pt-2 text-sm transition-colors",
                  "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary"
                )}
              >
                العروض
                <Badge variant="secondary" className="ms-1.5 h-4 px-1 text-xs">
                  {user._count?.listings ?? 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className={cn(
                  "flex-1 rounded-none border-b-2 border-transparent py-3 pt-2 text-sm transition-colors",
                  "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary"
                )}
              >
                آراء الآخرين
                {user.total_ratings > 0 && (
                  <Badge variant="secondary" className="ms-1.5 h-4 px-1 text-xs">
                    {user.total_ratings}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content - Listings */}
          <TabsContent value="listings" className="mt-0">
          {listings.length === 0 ? (
            <div className="py-12 text-center">
              <List size={32} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">لا توجد إعلانات نشطة</p>
              {isOwner && (
                <Button size="sm" className="mt-3" onClick={() => navigate("/add-listing")}>
                  <Plus size={13} className="me-1" /> أضف إعلانك الأول
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 pt-4">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30"
                >
                  <Link
                    to={`/products/${listing.id}`}
                    className="block"
                  >
                    <div className="flex gap-3 p-3 rtl:flex-row-reverse">
                      <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                        {(listing.type === "OFFER" || listing.type === "offer") ? (
                          <Badge variant="default" className="absolute top-0.5 end-0.5 h-5 px-1.5 text-[10px]">
                            عرض
                          </Badge>
                        ) : (listing.type === "REQUEST" || listing.type === "request") ? (
                          <Badge variant="secondary" className="absolute top-0.5 end-0.5 h-5 px-1.5 text-[10px]">
                            طلب
                          </Badge>
                        ) : null}
                        {listing.thumbnail ? (
                          <img
                            src={resolveImageUrl(listing.thumbnail)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon size={20} className="text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-start rtl:text-end">
                        <p className="line-clamp-2 text-sm font-semibold text-primary hover:text-primary/80">
                          {listing.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5 text-xs text-muted-foreground rtl:justify-start">
                          {listing.city?.name && (
                            <span>{listing.city.name}</span>
                          )}
                          {listing.main_category?.name && (
                            <span>{listing.main_category.name}</span>
                          )}
                        </div>
                        {listing.price != null && (
                          <p className="mt-0.5 text-sm font-bold text-primary">
                            {Number(listing.price).toLocaleString("ar-SA")} ﷼
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center justify-end gap-3 rtl:justify-start">
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            {listing.stats?.view_count ?? 0}
                            <Eye size={10} />
                          </span>
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            {listing.stats?.message_count ?? 0}
                            <MessageCircle size={10} />
                          </span>
                          {listing.updated_at && (
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(listing.updated_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                  {isOwner && (
                    <div className="flex gap-1 border-t border-border bg-muted/30 px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/products/${listing.id}/edit`)
                        }}
                      >
                        <Pencil size={11} /> تعديل
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleBump(listing.id)
                        }}
                      >
                        <ArrowUp size={11} /> تحديث
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm("هل تريد حذف هذا الإعلان؟")) {
                            apiClient.delete(`/products/${listing.id}`).then(() => {
                              queryClient.invalidateQueries({ queryKey: ["profile", identifier] })
                              queryClient.invalidateQueries({ queryKey: ["profile-listings", identifier] })
                              toast.success("تم حذف الإعلان")
                            })
                          }
                        }}
                      >
                        <Trash2 size={11} /> حذف
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {listingsData?.pagination?.last_page > 1 && (
                <div className="flex justify-center pb-4 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={listingsPage >= listingsData.pagination.last_page}
                    onClick={() => setListingsPage((p) => p + 1)}
                  >
                    تحميل المزيد
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* 6. Tab Content - Reviews */}
        <TabsContent value="reviews" className="mt-0">
          <div className="pt-4">
            {review_summary?.total > 0 && (
              <div className="mb-4 flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:gap-6 rtl:sm:flex-row-reverse">
                <div className="shrink-0 text-center">
                  <p className="text-5xl font-bold leading-none text-foreground">
                    {review_summary.average?.toFixed(1)}
                  </p>
                  <StarRating
                    value={review_summary.average}
                    readonly
                    size="sm"
                    className="mt-1.5 justify-center"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {review_summary.total} تقييم
                  </p>
                </div>
                <div className="flex-1">
                  <RatingBar
                    distribution={review_summary.distribution ?? {}}
                    total={review_summary.total}
                  />
                </div>
              </div>
            )}

            {!isOwner && me && (
              <Button
                variant={my_review ? "outline" : "default"}
                size="sm"
                className="mb-4 w-full gap-1.5"
                onClick={() => setReviewModal(true)}
              >
                <Star size={14} />
                {my_review
                  ? `تقييمك: ${my_review.rating} نجوم — اضغط للتعديل`
                  : "أضف تقييمك لهذا المستخدم"}
              </Button>
            )}

            {reviews.length === 0 ? (
              <div className="py-10 text-center">
                <Star size={32} className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">لا توجد تقييمات بعد</p>
              </div>
            ) : (
              <div>
                {reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onEdit={(r) => {
                      setEditReview(r)
                      setReviewModal(true)
                    }}
                    onDelete={handleDeleteReview}
                    onReact={handleReact}
                  />
                ))}
                {reviewsData?.pagination?.last_page > 1 && (
                  <div className="flex justify-center py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reviewsPage >= reviewsData.pagination.last_page}
                      onClick={() => setReviewsPage((p) => p + 1)}
                    >
                      تحميل المزيد
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        </Tabs>

        {isOwner && (
          <>
            <VisitorStatsCard enabled={isOwner} />
            <ReportsCard enabled={isOwner} />
          </>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>حذف الحساب</AlertDialogTitle>
          <AlertDialogDescription>
            هل أنت متأكد من حذف حسابك نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAccount}
            >
              حذف الحساب
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LeaveReviewModal
        open={reviewModal}
        onClose={() => {
          setReviewModal(false)
          setEditReview(null)
        }}
        targetUser={user}
        existingReview={editReview ?? my_review}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["profile", identifier] })
        }}
      />
    </div>
  )
}
