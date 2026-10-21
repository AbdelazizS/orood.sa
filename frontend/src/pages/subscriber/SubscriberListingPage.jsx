import { Link, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { markSubscriberListingSold } from "@/services/subscriberService"
import { AdStatusBadge } from "@/components/subscriber/SubscriberListingCard"
import { useTranslation } from "react-i18next"
import { getSubscriberProduct } from "@/services/subscriberService"
import { BuyAdButton } from "@/components/subscriber/BuyAdButton"
import { FollowUpNotesThread } from "@/components/subscriber/FollowUpNotesThread"
import {
  ListingAdDetailsGrid,
  ListingAmenitiesSection,
  ListingDescription,
  ListingImages,
} from "@/components/listing-detail"
import { PropertyLocationMap } from "@/components/maps/PropertyLocationMap.jsx"
import { formatFullPrice } from "@/lib/subscriber/subscriberFormat"
import { realEstatePurposeLabel, realEstateTypeLabel } from "@/lib/realEstate/labels"
import { timeAgo } from "@/lib/timeAgo"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, CheckCircle2, MapPin, Phone, UserRound } from "lucide-react"

/**
 * Full listing details for a subscriber: everything the owner uploaded (price + contact included).
 * Awaiting → "شراء الإعلان". Bought → private follow-up thread.
 */
export function SubscriberListingPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["subscriber", "product", id],
    queryFn: () => getSubscriberProduct(id),
    retry: false,
  })

  const soldMutation = useMutation({
    mutationFn: () => markSubscriberListingSold(data?.meta?.subscriber_listing_id),
    onSuccess: () => {
      toast.success(t("subscriber.ad.markedSold", "تم تسجيل بيع العقار"))
      queryClient.invalidateQueries({ queryKey: ["subscriber"] })
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.errorGeneric", "حدث خطأ")),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="aspect-[16/9] w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !data?.product) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">{t("subscriber.notAvailable", "هذا العقار غير متاح للمشترك.")}</p>
        <Button className="mt-4" variant="outline" asChild>
          <Link to="/subscriber/requests">{t("subscriber.tabs.available", "طلبات التسويق")}</Link>
        </Button>
      </div>
    )
  }

  const { product, meta } = data
  const re = product.real_estate ?? {}
  const price = formatFullPrice(product.price, t)
  const phone = product.contact_phone ?? product.contact_preferences?.phone_number ?? product.seller?.phone
  const place = [product.city?.name ?? product.location, product.district].filter(Boolean).join(" · ")
  const bought = Boolean(meta?.subscriber_listing_id)

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 pb-24 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-0">
      <article className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center border-b border-border px-2 py-2">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
            {t("common.back", "رجوع")}
          </Button>
        </div>

        <header className="space-y-2 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {bought ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <CheckCircle2 className="size-3.5" aria-hidden />
                {t("subscriber.bought", "تم شراء الإعلان")}
                {meta?.purchased_at ? ` · ${timeAgo(meta.purchased_at, t)}` : null}
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {t("subscriber.mapPin", "طلب تسويق")}
              </span>
            )}
            {re.property_type ? <span className="text-xs text-muted-foreground">{realEstateTypeLabel(re.property_type, t)}</span> : null}
            {re.purpose ? <span className="text-xs text-muted-foreground">· {realEstatePurposeLabel(re.purpose, t)}</span> : null}
          </div>
          <h1 className="text-xl font-bold leading-snug">{product.title}</h1>
          {place ? (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden />
              {place}
            </p>
          ) : null}
          <p className="text-2xl font-bold tabular-nums text-primary">{price ?? t("listingsMap.noPrice", "على السوم")}</p>
        </header>

        <ListingImages product={product} />
        <ListingDescription product={product} />
        {product.real_estate ? (
          <>
            <ListingAdDetailsGrid product={product} />
            <ListingAmenitiesSection product={product} />
          </>
        ) : null}
        <PropertyLocationMap product={product} />
      </article>

      <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-bold">{t("subscriber.ownerTitle", "بيانات صاحب العقار")}</h2>
          <p className="flex items-center gap-2 text-sm">
            <UserRound className="size-4 text-muted-foreground" aria-hidden />
            {product.seller?.name ?? "—"}
          </p>
          {phone ? (
            <a href={`tel:${phone}`} className="flex items-center gap-2 text-sm font-medium text-primary" dir="ltr">
              <Phone className="size-4" aria-hidden />
              {phone}
            </a>
          ) : null}
          {!bought ? (
            <div className="hidden lg:block">
              <BuyAdButton
                product={product}
                creditsBalance={meta?.credits_balance}
                className="h-11 w-full"
                onBought={() => refetch()}
              />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {t("subscriber.creditsLeft", { count: meta?.credits_balance ?? 0, defaultValue: "رصيدك: {{count}} إعلان" })}
              </p>
            </div>
          ) : null}
        </section>

        {bought ? (
          <section className="space-y-2 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">{t("subscriber.ad.title", "حالة الإعلان")}</h2>
              <AdStatusBadge
                status={meta.ad_status}
                daysLeft={meta.days_left}
              />
            </div>
            {meta.ad_status === "active" ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {t("subscriber.ad.durationHint", { days: meta.ad_days, defaultValue: "مدة الإعلان {{days}} يوماً، وبعدها يعود العقار لطلبات التسويق." })}
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={soldMutation.isPending}
                  onClick={() => {
                    if (window.confirm(t("subscriber.ad.confirmSold", "تأكيد أن العقار تم بيعه؟"))) soldMutation.mutate()
                  }}
                >
                  {t("subscriber.ad.markSold", "تم بيع العقار")}
                </Button>
              </>
            ) : meta.end_reason ? (
              <p className="text-xs text-muted-foreground">{meta.end_reason}</p>
            ) : null}
          </section>
        ) : null}

        {bought ? <FollowUpNotesThread subscriberListingId={meta.subscriber_listing_id} /> : null}
      </aside>

      {/* Mobile: sticky buy bar */}
      {!bought ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <BuyAdButton product={product} creditsBalance={meta?.credits_balance} className="h-11 w-full" onBought={() => refetch()} />
        </div>
      ) : null}
    </div>
  )
}
