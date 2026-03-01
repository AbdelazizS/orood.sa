import { useTranslation } from "react-i18next"
import { Star, Award, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * RatingDisplay — star rating + trust badges.
 */
export function RatingDisplay({ profile }) {
  const { t } = useTranslation()
  const rating = profile?.reviews_avg ?? 0
  const reviewsCount = profile?.reviews_count ?? 0
  const isVerified = profile?.is_verified ?? false

  if (rating === 0 && reviewsCount === 0 && !isVerified) return null

  return (
    <div className="flex flex-wrap items-center gap-4">
      {reviewsCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn(
                  "size-5",
                  s <= Math.round(rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/40"
                )}
              />
            ))}
          </div>
          <span className="text-sm font-medium">
            {rating.toFixed(1)} ({reviewsCount} {t("reviews.title", "reviews")})
          </span>
        </div>
      )}
      {isVerified && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <Shield className="size-4" />
          {t("profile.trustedSeller", "Trusted Seller")}
        </span>
      )}
      {rating >= 4.5 && reviewsCount >= 5 && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-700 dark:text-amber-400">
          <Award className="size-4" />
          {t("profile.topRated", "Top Rated")}
        </span>
      )}
    </div>
  )
}
