import { Link } from "react-router-dom"
import { Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function WholesaleProductCardVisual({
  product,
  status,
  imgSrc,
  t,
  compactUrgent = false,
  reduceMotion = false,
}) {
  return (
    <Link
      to={`/wholesale/product/${product.id}`}
      className={cn(
        "relative block w-full shrink-0 overflow-hidden bg-muted/25 dark:bg-muted/15",
        compactUrgent ? "aspect-[4/3] max-h-[200px] sm:max-h-[220px]" : "aspect-[4/3]"
      )}
    >
      {status ? (
        <div className="absolute start-3 top-3 z-20">
          <Badge className={cn("rounded-full px-3 py-1 text-[11px] font-medium shadow-sm", status.className)}>
            {status.label}
          </Badge>
        </div>
      ) : null}

      <div className="absolute end-3 top-3 z-20">
        <Badge className="rounded-full border-transparent bg-black px-3 py-1 text-[11px] font-semibold text-white dark:bg-white dark:text-black">
          {t("wholesale.market.discountBadge", { percent: product?.discount_percent ?? 0 })}
        </Badge>
      </div>

      {imgSrc ? (
        <img
          src={imgSrc}
          alt={product?.title ?? ""}
          className={cn(
            "absolute inset-0 size-full object-cover object-center transition-transform duration-500",
            !reduceMotion && "group-hover:scale-[1.03]"
          )}
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
          <Building2 className="size-10 text-muted-foreground" />
        </div>
      )}
    </Link>
  )
}
