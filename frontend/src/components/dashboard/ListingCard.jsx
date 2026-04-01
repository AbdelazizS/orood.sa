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
} from "lucide-react"
import { Loader2 } from "lucide-react"

const statusConfig = {
  ACTIVE: { label: "نشط", variant: "default", dot: "bg-green-500" },
  SOLD: { label: "مباع", variant: "secondary", dot: "bg-muted-foreground" },
  HIDDEN: { label: "مخفي", variant: "outline", dot: "bg-yellow-500" },
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
  const [menuOpen, setMenuOpen] = useState(false)
  const isBumping = onBump.isPending
  const isToggling = onToggleStatus.isPending
  const sc = statusConfig[listing.status] ?? statusConfig.ACTIVE
  const stats = listing.stats ?? {}

  return (
    <div
      className={cn(
        "border border-border rounded-xl overflow-hidden",
        "bg-card transition-all duration-200",
        "hover:border-primary/30 hover:shadow-sm",
        listing.status === "HIDDEN" && "opacity-75"
      )}
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
              "absolute top-1 right-1 text-xs px-1.5 py-0.5 rounded-full font-medium",
              listing.type === "OFFER"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            {listing.type === "OFFER" ? "عرض" : "طلب"}
          </div>
        </div>

        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              <Badge variant={sc.variant} className="text-xs h-4 px-1.5 gap-1">
                <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
                {sc.label}
              </Badge>
            </div>
            <button
              onClick={() => onView(listing.id)}
              className="flex-1 text-right hover:text-primary transition-colors line-clamp-2"
            >
              <span className="text-sm font-semibold text-foreground hover:text-primary">
                {listing.title}
              </span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {listing.main_category?.icon}
              {listing.main_category?.name}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{listing.city?.name}</span>
            {listing.price != null && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-sm font-bold text-primary">
                  {Number(listing.price).toLocaleString("ar-SA")} ر.س
                </span>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {(stats.view_count ?? 0).toLocaleString()}
              <Eye size={11} />
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {stats.message_count ?? 0}
              <MessageCircle size={11} />
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {stats.sold_count ?? 0}
              <ShoppingBag size={11} />
            </span>
            {(stats.pending_bids ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                {stats.pending_bids} سوم
                <Gavel size={11} />
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            {formatRelativeTime(listing.created_at)}
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
          <Pencil size={12} /> تعديل
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 flex-1"
          disabled={listing.status !== "ACTIVE" || isBumping}
          onClick={() => onBump.mutate(listing.id)}
        >
          {isBumping ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <ArrowUp size={12} />
          )}
          تحديث
        </Button>

        {listing.status !== "SOLD" && (
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
                <EyeOff size={12} /> إخفاء
              </>
            ) : (
              <>
                <Eye size={12} /> إظهار
              </>
            )}
          </Button>
        )}

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreHorizontal size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={() => {
                onView(listing.id)
                setMenuOpen(false)
              }}
              className="gap-2 justify-end"
            >
              <span>عرض الإعلان</span>
              <ExternalLink size={13} />
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onDuplicate.mutate(listing.id)
                setMenuOpen(false)
              }}
              className="gap-2 justify-end"
            >
              <span>نسخ الإعلان</span>
              <Copy size={13} />
            </DropdownMenuItem>
            {listing.status === "ACTIVE" && (
              <DropdownMenuItem
                onClick={() => {
                  onMarkSold.mutate(listing.id)
                  setMenuOpen(false)
                }}
                className="gap-2 justify-end"
              >
                <span>تحديد كمباع</span>
                <CheckCircle size={13} />
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                onDelete(listing.id)
                setMenuOpen(false)
              }}
              className="gap-2 justify-end text-destructive focus:text-destructive"
            >
              <span>حذف الإعلان</span>
              <Trash2 size={13} />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {(stats.pending_bids ?? 0) > 0 && (
        <div
          onClick={() => onView(listing.id)}
          className="flex items-center justify-between px-3 py-1.5 bg-orange-50 dark:bg-orange-950/30 border-t border-orange-100 dark:border-orange-900/30 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors"
        >
          <ChevronLeft size={13} className="text-orange-600" />
          <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">
            لديك {stats.pending_bids} سوم معلق — اضغط للمراجعة
          </p>
          <Gavel size={13} className="text-orange-600" />
        </div>
      )}
    </div>
  )
}
