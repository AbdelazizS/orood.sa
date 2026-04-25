import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  EyeOff,
  MessageCircle,
  ShoppingBag,
  Gavel,
  Pencil,
  ArrowUp,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  Copy,
  CheckCircle,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

const statusStyle = {
  ACTIVE: { variant: "default", dot: "bg-green-500" },
  SOLD: { variant: "secondary", dot: "bg-muted-foreground" },
  HIDDEN: { variant: "outline", dot: "bg-yellow-500" },
  PENDING_REVIEW: { variant: "secondary", dot: "bg-amber-500" },
  SUSPENDED: { variant: "destructive", dot: "bg-red-500" },
  ARCHIVED: { variant: "outline", dot: "bg-muted-foreground" },
  DRAFT: { variant: "outline", dot: "bg-slate-400" },
  DELETED: { variant: "destructive", dot: "bg-red-600" },
  OTHER: { variant: "outline", dot: "bg-muted-foreground" },
}

export function ListingCard({
  listing,
  onToggleStatus,
  onBump,
  onDelete,
  onMarkSold,
  onDuplicate,
  onEdit,
  onView,
}) {
  const { t, i18n } = useTranslation()
  const { direction } = useAppDirection()
  const [menuOpen, setMenuOpen] = useState(false)
  const isBumping = onBump.isPending
  const isToggling = onToggleStatus.isPending
  const style = statusStyle[listing.status] ?? statusStyle.OTHER
  const statusLabel = t(`dashboard.listingStatus.${listing.status}`, listing.status)
  const stats = listing.stats ?? {}
  const sellerCanToggleVisibility = ["ACTIVE", "HIDDEN", "PENDING_REVIEW", "DRAFT"].includes(listing.status)
  const canBumpOrMarkActive = listing.status === "ACTIVE"
  const dateLocale = i18n.language?.startsWith("ar") ? "ar" : "en"
  const priceLocale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US"

  return (
    <div
      className={cn(
        "border border-border rounded-xl overflow-hidden",
        "bg-card transition-all duration-200",
        "hover:border-primary/30 hover:shadow-sm",
        (listing.status === "HIDDEN" || listing.status === "SUSPENDED" || listing.status === "ARCHIVED") &&
          "opacity-75"
      )}
      dir={direction}
    >
      <div className="flex gap-3 p-3">
        <div className="relative h-20 w-24 shrink-0 rounded-lg overflow-hidden border border-border bg-muted">
          {listing.thumbnail ? (
            <img
              src={resolveImageUrl(listing.thumbnail)}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <ImageIcon size={20} className="text-muted-foreground" />
            </div>
          )}
          <div
            className={cn(
              "absolute top-1 end-1 text-xs px-1.5 py-0.5 rounded-full font-medium",
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

        <div className="flex-1 min-w-0 text-start">
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              <Badge variant={style.variant} className="text-xs h-4 px-1.5 gap-1">
                <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                {statusLabel}
              </Badge>
            </div>
            <button
              type="button"
              onClick={() => onView(listing.id)}
              className="flex-1 min-w-0 text-start hover:text-primary transition-colors line-clamp-2"
            >
              <span className="text-sm font-semibold text-foreground hover:text-primary">
                {listing.title}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-x-2 gap-y-0.5 mt-1">
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

          <div className="flex flex-wrap items-center justify-start gap-3 mt-2">
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
              <span className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                {t("dashboard.listingCard.pendingBidsInline", { count: stats.pending_bids })}
                <Gavel size={11} className="shrink-0" />
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            {formatRelativeTime(listing.created_at, dateLocale)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 px-3 py-2 border-t border-border bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 flex-1"
          onClick={() => onEdit(listing.id)}
        >
          <Pencil size={12} className="shrink-0" /> {t("dashboard.listingCard.edit")}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 flex-1"
          disabled={!canBumpOrMarkActive || isBumping}
          onClick={() => onBump.mutate(listing.id)}
        >
          {isBumping ? (
            <Loader2 size={12} className="animate-spin shrink-0" />
          ) : (
            <ArrowUp size={12} className="shrink-0" />
          )}
          {t("dashboard.listingCard.bump")}
        </Button>

        {listing.status !== "SOLD" && sellerCanToggleVisibility && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 flex-1"
            disabled={isToggling}
            onClick={() =>
              onToggleStatus.mutate({
                id: listing.id,
                newStatus: listing.status === "ACTIVE" ? "HIDDEN" : "ACTIVE",
              })
            }
          >
            {listing.status === "ACTIVE" ? (
              <>
                <EyeOff size={12} className="shrink-0" /> {t("dashboard.listingHide")}
              </>
            ) : (
              <>
                <Eye size={12} className="shrink-0" /> {t("dashboard.listingShow")}
              </>
            )}
          </Button>
        )}

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" aria-label={t("dashboard.listingCard.moreActions")}>
              <MoreHorizontal size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44" dir={direction}>
            <DropdownMenuItem
              onClick={() => {
                onView(listing.id)
                setMenuOpen(false)
              }}
              className="gap-2"
            >
              <ExternalLink size={13} className="shrink-0" />
              <span className="flex-1 text-start">{t("dashboard.listingCard.viewListing")}</span>
            </DropdownMenuItem>
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
            {canBumpOrMarkActive && (
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
          className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-950/30 border-t border-orange-100 dark:border-orange-900/30 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors"
        >
          <ChevronRight className="size-3.5 shrink-0 text-orange-600 rtl:rotate-180" />
          <p className="flex-1 text-xs text-orange-700 dark:text-orange-400 font-medium text-start">
            {t("dashboard.listingCard.pendingBidsBanner", { count: stats.pending_bids })}
          </p>
          <ChevronLeft className="size-3.5 shrink-0 text-orange-600 rtl:rotate-180" />
        </div>
      )}
    </div>
  )
}
