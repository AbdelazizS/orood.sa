import { useTranslation } from "react-i18next"
import { Loader2, MapPin, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatAddress } from "@/lib/location/formatAddress"
import { cn } from "@/lib/utils"

/**
 * Marketplace-style selected location bar — attached to the bottom of map pickers.
 */
export function LocationSelectedBar({
  address,
  city,
  region,
  onEdit,
  loading = false,
  className,
  readOnly = false,
}) {
  const { t } = useTranslation()
  const text = formatAddress({ address, city, region })
  const showBar = Boolean(text?.trim()) || loading

  if (!showBar) return null

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 border-t border-border/60 bg-card px-4 py-3.5 sm:gap-4 sm:py-4",
        className,
      )}
    >
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 sm:size-11"
        aria-hidden
      >
        <MapPin className="size-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1 text-start">
        <p className="text-xs font-medium text-muted-foreground">
          {t("location.confirmed", "الموقع المحدد")}
        </p>
        {loading ? (
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            {t("location.resolvingAddress", "جاري تحديد العنوان…")}
          </p>
        ) : (
          <p className="mt-0.5 text-base font-semibold leading-snug text-foreground sm:text-[17px]">
            {text}
          </p>
        )}
      </div>
      {onEdit && !readOnly ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-0.5 shrink-0 gap-1.5 rounded-lg"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" aria-hidden />
          {t("location.changeLocation", "تغيير")}
        </Button>
      ) : null}
    </div>
  )
}
