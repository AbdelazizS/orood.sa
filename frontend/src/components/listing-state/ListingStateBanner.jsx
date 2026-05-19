import { useTranslation } from "react-i18next"
import { AlertTriangle, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ListingActionButtons } from "@/components/listing-state/ListingActionButtons"
import { cn } from "@/lib/utils"

/**
 * Seller workflow banner — title, message, blocking badge, API-driven CTAs.
 */
export function ListingStateBanner({ sellerState, compact = false, className, onHideListing }) {
  const { t } = useTranslation()

  if (!sellerState?.status) return null

  if (sellerState.status === "active" && !sellerState.blocking) {
    return null
  }

  const blocking = Boolean(sellerState.blocking)
  const actions = sellerState.available_actions ?? []
  const showBanner = blocking || actions.length > 0

  if (!showBanner && sellerState.status === "active") return null

  const Icon = blocking ? AlertTriangle : Info

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 text-start",
        blocking
          ? "border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30"
          : "border-border/60 bg-muted/30",
        compact ? "py-2" : "py-3",
        className,
      )}
      role="status"
    >
      <div className="flex items-start gap-2.5">
        <Icon
          className={cn("mt-0.5 size-4 shrink-0", blocking ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn("font-semibold text-foreground", compact ? "text-xs" : "text-sm")}>
              {sellerState.title}
            </p>
            {blocking ? (
              <Badge variant="outline" className="border-amber-600/50 text-amber-800 dark:text-amber-300 text-[10px]">
                {t("listingState.blockingBadge", "يتطلب إجراء")}
              </Badge>
            ) : null}
          </div>
          {sellerState.message ? (
            <p className={cn("text-muted-foreground leading-relaxed", compact ? "text-xs" : "text-sm")}>
              {sellerState.message}
            </p>
          ) : null}
          {sellerState.rejection_reason ? (
            <p className="text-xs text-destructive/90">{sellerState.rejection_reason}</p>
          ) : null}
          <ListingActionButtons actions={actions} size="sm" onHideListing={onHideListing} />
        </div>
      </div>
    </div>
  )
}
