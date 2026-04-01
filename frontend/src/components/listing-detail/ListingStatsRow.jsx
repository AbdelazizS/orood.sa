import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { ShoppingBag, Eye, MessageCircle, Check } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

/**
 * Section 9 — Stats Row.
 * RTL flex, justify-end, gap-4. Icon + label + number.
 */
export function ListingStatsRow({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const stats = product?.stats ?? {}
  const soldCount = product?.sold_count ?? stats.purchases ?? 0
  const todayViewCount =
    product?.today_view_count ?? product?.view_count ?? stats.views ?? 0
  const messageCount = product?.message_count ?? stats.messages ?? 0
  const freeShipping = product?.free_shipping ?? product?.shipping_details?.free_shipping ?? false
  const freeReturn = product?.free_return ?? product?.shipping_details?.free_return ?? false

  const statItems = [
    {
      key: "sold",
      label: t("listingDetail.soldCount", "تم بيع هذا المنتج"),
      value: soldCount,
      icon: ShoppingBag,
      iconClass: "text-primary",
    },
    {
      key: "views",
      label: t("listingDetail.viewedToday", "عدد من شاهد المنتج اليوم"),
      value: todayViewCount,
      icon: Eye,
      iconClass: "text-muted-foreground",
    },
    {
      key: "messages",
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
        className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-3 sm:px-6"
      >
        {statItems.map(({ key, label, value, icon: Icon, iconClass }) => (
          <div
            key={key}
            dir={direction}
            className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-start"
          >
            <div className={cn("shrink-0", iconClass)}>
              <Icon className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold text-foreground">{value}</p>
            </div>
          </div>
        ))}
        {(freeShipping || freeReturn) && (
          <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
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
