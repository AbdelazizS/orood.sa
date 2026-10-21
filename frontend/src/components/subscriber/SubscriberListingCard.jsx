import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { realEstatePurposeLabel, realEstateTypeLabel } from "@/lib/realEstate/labels"
import { timeAgo } from "@/lib/timeAgo"
import { formatFullPrice } from "@/lib/subscriber/subscriberFormat"
import { MapPin, MessageSquareText } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Listing row for the subscriber area: photo, price, type, place. `footer` adds the buy button or note info.
 * Pass `to` to link somewhere, or `onOpen` to handle the click (e.g. open a side panel).
 */
export function SubscriberListingCard({ product, to, onOpen, badge, unreadCount = 0, footer, className }) {
  const { t } = useTranslation()
  const re = product?.real_estate ?? {}
  const image = product?.media?.image_url ?? product?.media?.gallery?.[0]
  const price = formatFullPrice(product?.price, t)
  const place = [product?.city?.name ?? product?.location, product?.district].filter(Boolean).join(" · ")
  const specs = [
    re.property_type ? realEstateTypeLabel(re.property_type, t) : null,
    re.purpose ? realEstatePurposeLabel(re.purpose, t) : null,
    re.area_sqm ? t("realEstate.areaSqm", { value: Math.round(re.area_sqm), defaultValue: "{{value}} م²" }) : null,
    re.bedrooms ? t("realEstate.rooms", { count: re.bedrooms, defaultValue: "{{count}} غرف" }) : null,
  ].filter(Boolean)
  const BodyTag = onOpen ? "button" : Link
  const bodyProps = onOpen ? { type: "button", onClick: onOpen } : { to }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm transition-colors",
        unreadCount > 0 ? "border-destructive/60 ring-1 ring-destructive/30" : "border-border",
        className,
      )}
    >
      <BodyTag
        {...bodyProps}
        className="flex w-full gap-3 p-3 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-28">
          {image ? <img src={image} alt="" loading="lazy" className="size-full object-cover" /> : null}
          {badge ? <div className="absolute start-1.5 top-1.5">{badge}</div> : null}
          {unreadCount > 0 ? (
            <span
              className="absolute end-1.5 bottom-1.5 flex h-7 min-w-7 items-center justify-center rounded-md bg-destructive px-1.5 text-sm font-bold text-white shadow tabular-nums"
              aria-label={t("subscriber.notes.unreadAria", { count: unreadCount, defaultValue: "{{count}} متابعة غير مقروءة" })}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground sm:text-base">{product?.title}</h3>
          <p className="text-base font-bold tabular-nums text-primary">{price ?? t("listingsMap.noPrice", "على السوم")}</p>
          {specs.length ? <p className="truncate text-xs text-muted-foreground">{specs.join(" · ")}</p> : null}
          {place ? (
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              {place}
            </p>
          ) : null}
        </div>
      </BodyTag>
      {footer ? <div className="border-t border-border px-3 py-2.5">{footer}</div> : null}
    </article>
  )
}

const AD_STATUS_STYLES = {
  active: "bg-primary/15 text-primary",
  expired: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
  sold: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
}

/** Ad status chip: active (days left) / expired / cancelled / sold. */
export function AdStatusBadge({ status = "active", daysLeft }) {
  const { t } = useTranslation()
  const label =
    status === "active"
      ? daysLeft != null
        ? t("subscriber.ad.daysLeft", { count: daysLeft, defaultValue: "نشط · متبقي {{count}} يوم" })
        : t("subscriber.ad.active", "نشط")
      : t(`subscriber.ad.${status}`, status)
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", AD_STATUS_STYLES[status] ?? AD_STATUS_STYLES.expired)}>
      {label}
    </span>
  )
}

/** "3 متابعات · آخر متابعة منذ ساعة" line for bought listings. */
export function NotesMeta({ notesCount, lastNoteAt, unreadCount = 0 }) {
  const { t } = useTranslation()
  if (!notesCount) {
    return <p className="text-xs text-muted-foreground">{t("subscriber.notes.none", "لا توجد متابعات بعد")}</p>
  }
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <MessageSquareText className="size-3.5" aria-hidden />
      {t("subscriber.notes.count", { count: notesCount, defaultValue: "{{count}} متابعة" })}
      {lastNoteAt ? ` · ${t("subscriber.notes.last", "آخر متابعة")} ${timeAgo(lastNoteAt, t)}` : null}
      {unreadCount > 0 ? (
        <span className="font-semibold text-destructive">
          · {t("subscriber.notes.unread", { count: unreadCount, defaultValue: "{{count}} جديدة" })}
        </span>
      ) : null}
    </p>
  )
}
