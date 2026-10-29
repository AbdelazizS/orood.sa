import { createElement } from "react"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { ShoppingBag, Eye, MessageCircle, Users, Check } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

/**
 * Section 9 — three stats only (PDF). Share/report live in header for visitors.
 */
export function ListingStatsRow({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const stats = product?.stats ?? {}
  const soldCount = product?.sold_count ?? 0
  const todayViews =
    stats.today_view_count ?? stats.today_views ?? product?.today_view_count ?? product?.view_count ?? stats.views ?? 0
  const messageCount = product?.message_count ?? stats.messages ?? 0
  const isWholesale = Boolean(product?.is_wholesale)
  const activeBuyerCount = Number(product?.active_buyer_count ?? 0)
  const freeShipping = product?.free_shipping ?? product?.shipping_details?.free_shipping ?? false
  const freeReturn = product?.free_return ?? product?.shipping_details?.free_return ?? false

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

      <Separator />
    </>
  )
}
