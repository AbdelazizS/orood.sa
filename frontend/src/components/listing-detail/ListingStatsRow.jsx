import { createElement, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { ListingFeedbackDialog } from "@/components/listing-detail/ListingFeedbackDialog"
import { Button } from "@/components/ui/button"
import { useAppDirection } from "@/providers/DirectionProvider"
import { ShoppingBag, Eye, MessageCircle, Users, Check, Image as ImageIcon, Truck, ShieldAlert, BadgeCheck, Star } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

/**
 * Section 9 — three stats only (PDF). Share/report live in header for visitors.
 */
export function ListingStatsRow({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const user = useAuthStore((s) => s.user)
  const [rateOpen, setRateOpen] = useState(false)
  const isOwner = Boolean(user && product?.seller?.id && Number(user.id) === Number(product.seller.id))
  // Can I rate this listing? (received it, or dealt with the seller about it)
  const { data: feedback } = useQuery({
    queryKey: ["listing-feedback", product?.id],
    queryFn: async () => (await apiClient.get(`/listings/${product.id}/feedback/mine`)).data?.data ?? null,
    enabled: Boolean(user && product?.id && !isOwner && !product?.is_wholesale),
    staleTime: 60_000,
  })
  const stats = product?.stats ?? {}
  const soldCount = product?.sold_count ?? 0
  const todayViews =
    stats.today_view_count ?? stats.today_views ?? product?.today_view_count ?? product?.view_count ?? stats.views ?? 0
  const messageCount = product?.message_count ?? stats.messages ?? 0
  const isWholesale = Boolean(product?.is_wholesale)
  const activeBuyerCount = Number(product?.active_buyer_count ?? 0)
  const freeShipping = product?.free_shipping ?? product?.shipping_details?.free_shipping ?? false
  const freeReturn = product?.free_return ?? product?.shipping_details?.free_return ?? false

  // Buyer feedback after delivery (API: data.quality).
  const quality = product?.quality ?? null
  const pct = (v) => (v == null ? "—" : `${v}%`)
  const qualityItems = quality
    ? [
        {
          id: "photos",
          label: t("listingDetail.quality.matchesPhotos", "المنتج / الخدمة مطابقة للصور"),
          value: pct(quality.matches_photos_pct),
          icon: ImageIcon,
          tone: "text-primary",
        },
        {
          id: "speed",
          label: t("listingDetail.quality.deliverySpeed", "سرعة التوصيل / الإنجاز"),
          value: pct(quality.delivery_speed_pct),
          icon: Truck,
          tone: "text-primary",
        },
        {
          id: "complaints",
          label: t("listingDetail.quality.complaints", "عدد الشكاوى على المنتج / الخدمة"),
          value: quality.complaints_count ?? 0,
          icon: ShieldAlert,
          tone: quality.complaints_count ? "text-destructive" : "text-muted-foreground",
        },
      ]
    : []

  const statItems = [
    {
      id: "sold",
      label: t("listingDetail.soldCount", "تم بيع هذه المنتج"),
      value: soldCount,
      icon: ShoppingBag,
      iconClass: "text-primary",
    },
    {
      id: "views",
      label: t("listingDetail.viewedToday", "عدد من شاهدوا المنتج اليوم"),
      value: todayViews,
      icon: Eye,
      iconClass: "text-muted-foreground",
    },
    isWholesale
      ? {
          id: "activeBuyers",
          label: t("wholesale.pdp.stats.activeBuyers", "مشترون في المجموعة"),
          value: activeBuyerCount,
          icon: Users,
          iconClass: "text-muted-foreground",
        }
      : {
          id: "messages",
          label: t("listingDetail.messagedCount", "عدد الذين تواصلوا عبر رسائل"),
          value: messageCount,
          icon: MessageCircle,
          iconClass: "text-muted-foreground",
        },
  ]

  return (
    <>
      <div
        dir={direction}
        className="grid grid-cols-3 gap-x-2 gap-y-2 px-4 py-3 sm:gap-x-4 sm:px-6"
      >
        {statItems.map(({ id, label, value, icon: IconComponent, iconClass }) => (
          <div
            key={id}
            dir={direction}
            className="flex min-w-0 flex-col items-center justify-center gap-1 text-center"
          >
            <div className="flex items-center justify-center gap-1.5">
              <div className={cn("shrink-0", iconClass)}>
                {createElement(IconComponent, { className: "size-5 sm:size-[22px]" })}
              </div>
              <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
            </div>
            <p className="max-w-full text-[11px] leading-snug text-muted-foreground sm:text-xs">
              {label}
            </p>
          </div>
        ))}
        {(freeShipping || freeReturn) && (
          <div className="col-span-3 flex flex-wrap items-center justify-center gap-2 pt-1">
            {freeShipping && (
              <div className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-primary">
                <Check className="size-3.5" />
                {t("listingDetail.freeShipping", "الشحن مجانا")}
              </div>
            )}
            {freeReturn && (
              <div className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-primary">
                <Check className="size-3.5" />
                {t("listingDetail.freeReturnShort", "ولاسترجاع الفوري مجانا")}
              </div>
            )}
          </div>
        )}
      </div>

      {!isWholesale && quality ? (
        <div dir={direction} className="border-t border-border/60 px-4 py-3 sm:px-6">
          <p className="mb-2 text-center text-xs font-semibold text-muted-foreground">
            {t("listingDetail.quality.title", "بعد استلام واكتمال الطلب")}
          </p>
          <div className="grid grid-cols-3 gap-x-2 gap-y-2 sm:gap-x-4">
            {qualityItems.map(({ id, label, value, icon: IconComponent, tone }) => (
              <div key={id} className="flex min-w-0 flex-col items-center justify-center gap-1 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  {createElement(IconComponent, { className: cn("size-5 shrink-0", tone) })}
                  <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
                </div>
                <p className="max-w-full text-[11px] leading-snug text-muted-foreground sm:text-xs">{label}</p>
              </div>
            ))}
          </div>
          {quality.ratings_count ? (
            <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 text-center text-[11px] text-muted-foreground">
              {t("listingDetail.quality.basedOn", { count: quality.ratings_count, defaultValue: "حسب تقييم {{count}} مشترٍ" })}
              {quality.verified_count ? (
                <span className="inline-flex items-center gap-1 text-primary">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  {t("listingDetail.quality.verified", { count: quality.verified_count, defaultValue: "{{count}} مشترٍ موثّق" })}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              {t("listingDetail.quality.none", "لا توجد تقييمات بعد — يقيّم المشتري بعد استلام الطلب")}
            </p>
          )}
          {feedback?.can_rate ? (
            <div className="mt-2 flex justify-center">
              <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={() => setRateOpen(true)}>
                <Star className="size-4 text-amber-500" aria-hidden />
                {feedback.mine
                  ? t("listingDetail.quality.editMine", "تعديل تقييمي")
                  : t("listingDetail.quality.rate", "قيّم هذا المنتج")}
              </Button>
            </div>
          ) : null}
          {rateOpen ? (
            <ListingFeedbackDialog
              open={rateOpen}
              onOpenChange={setRateOpen}
              productId={product.id}
              initial={feedback?.mine ?? null}
              verified={Boolean(feedback?.verified_purchase)}
            />
          ) : null}
        </div>
      ) : null}

      <Separator />
    </>
  )
}
