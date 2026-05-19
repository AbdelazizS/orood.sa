import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/imageUrl"
import { formatRelativeTime } from "@/lib/dashboardUtils"
import { useAppDirection } from "@/providers/DirectionProvider"
import {
  Eye,
  MessageCircle,
  ShoppingBag,
  Gavel,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  Copy,
  CheckCircle,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ListingStateBanner } from "@/components/listing-state/ListingStateBanner"
import { getPrimaryListingAction } from "@/components/listing-state"
import { Badge } from "@/components/ui/badge"

const STATUS_CHIP_KEYS = {
  awaiting_payment_setup: "listingState.status.awaiting_payment_setup",
  pending_moderation: "listingState.status.pending_moderation",
  moderation_rejected: "listingState.status.moderation_rejected",
  payout_profile_pending_review: "listingState.status.payout_profile_pending_review",
  pending_publish: "listingState.status.pending_publish",
  PENDING_REVIEW: "listingState.status.pending_moderation",
}

export function ListingCard({ listing, onDelete, onMarkSold, onDuplicate, onView, onHideListing }) {
  const { t, i18n } = useTranslation()
  const { direction } = useAppDirection()
  const [menuOpen, setMenuOpen] = useState(false)
  const stats = listing.stats ?? {}
  const canMarkSold = listing.status === "ACTIVE"
  const sellerState = listing.seller_state
  const primaryAction = getPrimaryListingAction(sellerState)
  const statusKey =
    sellerState?.status ?? listing.status
  const chipKey = STATUS_CHIP_KEYS[statusKey] ?? STATUS_CHIP_KEYS[listing.status]
  const dateLocale = i18n.language?.startsWith("ar") ? "ar" : "en"
  const priceLocale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US"

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card transition-all duration-200",
        "hover:border-primary/30 hover:shadow-sm",
        (listing.status === "HIDDEN" || listing.status === "SUSPENDED" || listing.status === "ARCHIVED") &&
          "opacity-75"
      )}
      dir={direction}
    >
      <div className="flex gap-3 p-3">
        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          {listing.thumbnail ? (
            <img
              src={resolveImageUrl(listing.thumbnail)}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon size={20} className="text-muted-foreground" />
            </div>
          )}
          <div
            className={cn(
              "absolute end-1 top-1 rounded-full px-1.5 py-0.5 text-xs font-medium",
              listing.type === "OFFER"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            {listing.type === "OFFER"
              ? t("dashboard.listingCard.typeOffer")
              : t("dashboard.listingCard.typeRequest")}
          </div>
        </div>

        <div className="min-w-0 flex-1 text-start">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onView(listing.id)}
              className="line-clamp-2 min-w-0 flex-1 text-start transition-colors hover:text-primary"
            >
              <span className="text-sm font-semibold text-foreground hover:text-primary">
                {listing.title}
              </span>
            </button>
            {chipKey && sellerState?.status !== "active" ? (
              <Badge
                variant="outline"
                className={
                  sellerState?.blocking
                    ? "shrink-0 border-amber-600/50 text-amber-800 dark:text-amber-300"
                    : "shrink-0"
                }
              >
                {t(chipKey, sellerState?.title ?? listing.status)}
              </Badge>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-start gap-x-2 gap-y-0.5">
            <span className="text-xs text-muted-foreground">
              {listing.main_category?.icon}
              {listing.main_category?.name}
            </span>
            <span className="text-xs text-muted-foreground" aria-hidden>
              •
            </span>
            <span className="text-xs text-muted-foreground">{listing.city?.name}</span>
            {listing.price != null && (
              <>
                <span className="text-xs text-muted-foreground" aria-hidden>
                  •
                </span>
                <span className="text-sm font-bold text-primary">
                  {Number(listing.price).toLocaleString(priceLocale)}
                  {t("dashboard.listingCard.currencySuffix")}
                </span>
              </>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-start gap-3">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {(stats.view_count ?? 0).toLocaleString(priceLocale)}
              <Eye size={11} className="shrink-0" />
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {stats.message_count ?? 0}
              <MessageCircle size={11} className="shrink-0" />
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {stats.sold_count ?? 0}
              <ShoppingBag size={11} className="shrink-0" />
            </span>
            {(stats.pending_bids ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-orange-600">
                {t("dashboard.listingCard.pendingBidsInline", { count: stats.pending_bids })}
                <Gavel size={11} className="shrink-0" />
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            {formatRelativeTime(listing.created_at, dateLocale)}
          </p>
        </div>
      </div>

      {sellerState?.blocking || (sellerState?.available_actions?.length > 0 && sellerState?.status !== "active") ? (
        <div className="border-t border-border px-3 py-2">
          <ListingStateBanner
            sellerState={sellerState}
            compact
            onHideListing={onHideListing ? () => onHideListing(listing.id) : undefined}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/30 px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => onView(listing.id)}
        >
          <ExternalLink size={12} className="shrink-0" />
          {t("dashboard.listingCard.viewListing")}
        </Button>

        {primaryAction?.href ? (
          <Button variant="default" size="sm" className="h-7 px-2 text-xs" asChild>
            <Link to={primaryAction.href.startsWith("/") ? primaryAction.href : `/${primaryAction.href}`}>
              {primaryAction.label || t(primaryAction.i18n_label_key, primaryAction.i18n_label_key)}
            </Link>
          </Button>
        ) : null}

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              aria-label={t("dashboard.listingCard.moreActions")}
            >
              <MoreHorizontal size={14} />
              {t("dashboard.listingCard.moreActions")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44" dir={direction}>
            <DropdownMenuItem
              onClick={() => {
                onDuplicate(listing)
                setMenuOpen(false)
              }}
              className="gap-2"
            >
              <Copy size={13} className="shrink-0" />
              <span className="flex-1 text-start">{t("dashboard.listingCard.duplicateListing")}</span>
            </DropdownMenuItem>
            {canMarkSold && (
              <DropdownMenuItem
                onClick={() => {
                  onMarkSold.mutate(listing.id)
                  setMenuOpen(false)
                }}
                className="gap-2"
              >
                <CheckCircle size={13} className="shrink-0" />
                <span className="flex-1 text-start">{t("dashboard.listingCard.markSold")}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                onDelete(listing.id)
                setMenuOpen(false)
              }}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 size={13} className="shrink-0" />
              <span className="flex-1 text-start">{t("dashboard.listingCard.deleteListing")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {(stats.pending_bids ?? 0) > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => onView(listing.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onView(listing.id)
            }
          }}
          className="flex cursor-pointer items-center gap-2 border-t border-orange-100 bg-orange-50 px-3 py-1.5 transition-colors hover:bg-orange-100 dark:border-orange-900/30 dark:bg-orange-950/30 dark:hover:bg-orange-950/50"
        >
          <ChevronRight className="size-3.5 shrink-0 text-orange-600 rtl:rotate-180" />
          <p className="flex-1 text-start text-xs font-medium text-orange-700 dark:text-orange-400">
            {t("dashboard.listingCard.pendingBidsBanner", { count: stats.pending_bids })}
          </p>
          <ChevronLeft className="size-3.5 shrink-0 text-orange-600 rtl:rotate-180" />
        </div>
      )}
    </div>
  )
}
