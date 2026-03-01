import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { Package, ShoppingBag, LayoutGrid, Star } from "lucide-react"
import { cn } from "@/lib/utils"

const statCardClass = cn(
  "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
  "border bg-card"
)

/**
 * ProfileStats — horizontal stats row with icons.
 */
export function ProfileStats({ profile }) {
  const { t } = useTranslation()
  const totalListings = profile?.listings_count ?? 0
  const soldItems = profile?.sold_items ?? 0
  const activeListings = profile?.active_listings ?? totalListings
  const rating = profile?.reviews_avg ?? 0
  const reviewsCount = profile?.reviews_count ?? 0

  const stats = [
    {
      icon: LayoutGrid,
      value: totalListings,
      label: t("profile.stats.totalListings", "Total Listings"),
    },
    {
      icon: ShoppingBag,
      value: soldItems,
      label: t("profile.stats.soldItems", "Sold Items"),
    },
    {
      icon: Package,
      value: activeListings,
      label: t("profile.stats.activeListings", "Active Listings"),
    },
    {
      icon: Star,
      value: rating > 0 ? rating.toFixed(1) : "—",
      label: t("profile.stats.rating", "Rating"),
      sub: reviewsCount > 0 ? `(${reviewsCount})` : null,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className={statCardClass}>
            <CardContent className="flex flex-col gap-2 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-5 shrink-0" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  {stat.label}
                </span>
              </div>
              <p className="text-2xl font-bold sm:text-3xl">
                {stat.value}
                {stat.sub && (
                  <span className="ms-1 text-base font-normal text-muted-foreground">
                    {stat.sub}
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
