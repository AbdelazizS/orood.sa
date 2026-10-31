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
  // Bar colour by score: green ≥ 80%, amber ≥ 50%, red below.
  const scoreTone = (v) =>
    v == null ? "bg-muted-foreground/20" : v >= 80 ? "bg-emerald-500" : v >= 50 ? "bg-amber-500" : "bg-red-500"
  const qualityItems = quality
    ? [
        {
          id: "photos",
          label: t("listingDetail.quality.matchesPhotosFull", "المنتج / الخدمة مطابق للصور"),
          fullLabel: t("listingDetail.quality.matchesPhotos", "المنتج / الخدمة مطابقة للصور"),
          value: pct(quality.matches_photos_pct),
          percent: quality.matches_photos_pct,
          icon: ImageIcon,
          iconWrap: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        },
        {
          id: "speed",
          label: t("listingDetail.quality.deliverySpeed", "سرعة التوصيل / الإنجاز"),
          fullLabel: t("listingDetail.quality.deliverySpeed", "سرعة التوصيل / الإنجاز"),
          value: pct(quality.delivery_speed_pct),
          percent: quality.delivery_speed_pct,
          icon: Truck,
          iconWrap: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
        },
        {
          id: "complaints",
          label: t("listingDetail.quality.complaintsCount", "عدد الشكاوى"),
          fullLabel: t("listingDetail.quality.complaints", "عدد الشكاوى على المنتج / الخدمة"),
          value: quality.complaints_count ?? 0,
          percent: null,
          icon: ShieldAlert,
          iconWrap: quality.complaints_count
            ? "bg-red-500/10 text-red-600 dark:text-red-400"
            : "bg-muted text-muted-foreground",
          note: quality.complaints_count
            ? null
            : t("listingDetail.quality.noComplaints", "لا توجد شكاوى"),
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
        <section dir={direction} className="border-t border-border/60 px-4 py-4 sm:px-6" aria-label={t("listingDetail.quality.titleAfterSale", "ما بعد البيع أو إنجاز الطلب")}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground sm:text-base">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <BadgeCheck className="size-4" aria-hidden />
              </span>
              {t("listingDetail.quality.titleAfterSale", "ما بعد البيع أو إنجاز الطلب")}
            </h3>
            {quality.ratings_count ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
                {t("listingDetail.quality.basedOn", { count: quality.ratings_count, defaultValue: "حسب تقييم {{count}} مشترٍ" })}
                {quality.verified_count ? (
                  <span className="text-primary">
                    · {t("listingDetail.quality.verified", { count: quality.verified_count, defaultValue: "{{count}} مشترٍ موثّق" })}
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {qualityItems.map(({ id, label, fullLabel, value, percent, icon: IconComponent, iconWrap, note }) => (
              <div
                key={id}
                title={fullLabel}
                className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/25 px-2 py-2.5 text-center sm:px-3"
              >
                <span className={cn("flex size-8 items-center justify-center rounded-full", iconWrap)}>
                  {createElement(IconComponent, { className: "size-4", "aria-hidden": true })}
                </span>
                <p className="text-lg font-extrabold leading-none tabular-nums text-foreground">{value}</p>
                {id !== "complaints" ? (
                  <div className="h-1 w-full max-w-[6rem] overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className={cn("h-full rounded-full transition-[width]", scoreTone(percent))} style={{ width: `${percent ?? 0}%` }} />
                  </div>
                ) : (
                  <p className={cn("text-[10px] font-semibold sm:text-[11px]", quality.complaints_count ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                    {note ?? t("listingDetail.quality.hasComplaints", "بلاغات قيد المتابعة")}
                  </p>
                )}
                <p className="max-w-full text-[11px] font-medium leading-snug text-muted-foreground sm:text-xs">{label}</p>
              </div>
            ))}
          </div>

          {!quality.ratings_count ? (
            <p className="mx-auto mt-3 flex w-fit max-w-full items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-center text-[11px] text-muted-foreground sm:text-xs">
              <Star className="size-3.5 shrink-0 text-amber-400" aria-hidden />
              {t("listingDetail.quality.none", "لا توجد تقييمات بعد — يقيّم المشتري بعد استلام الطلب")}
            </p>
          ) : null}

          {feedback?.can_rate ? (
            <div className="mt-3 flex justify-center">
              <Button className="h-9 w-full gap-2 rounded-full sm:w-auto sm:px-6" variant={feedback.mine ? "outline" : "default"} onClick={() => setRateOpen(true)}>
                <Star className={cn("size-4", feedback.mine ? "text-amber-500" : "fill-current")} aria-hidden />
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
        </section>
      ) : null}

      <Separator />
    </>
  )
}
