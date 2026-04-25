import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Building2, CheckCircle2, Users } from "lucide-react"
import { cn } from "@/lib/utils"

export function WholesaleProductCard({
  product,
  t,
  onReserve,
  onCancel,
  reservePending = false,
  cancelPending = false,
  dir = "rtl",
}) {
  const isReserved = Boolean(product?.user_reserved)
  const reservationStatus = product?.my_reservation?.status
  const isCompleted = Boolean(product?.campaign_completed)
  const canCancel = isReserved && reservationStatus === "pending"
  const canReserve = !isReserved && !isCompleted && Number(product?.remaining_needed ?? 0) > 0
  const readyForCheckout = reservationStatus === "payment_pending"
  const numberFormatter = new Intl.NumberFormat(dir === "rtl" ? "ar-SA" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  const priceValue = Number(product?.price ?? 0)
  const wholesaleValue = Number(product?.wholesale_price ?? 0)
  const formatMoney = (value) => (Number.isFinite(value) && value > 0
    ? `${numberFormatter.format(value)} ${t("common.currency", "ر.س")}`
    : t("feed.priceOnRequest"))

  const cta = (() => {
    if (canCancel) {
      return (
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => onCancel?.(product.id)}
          disabled={cancelPending}
        >
          {t("wholesale.market.cancelReserve")}
        </Button>
      )
    }
    if (canReserve) {
      return (
        <Button className="w-full" onClick={() => onReserve?.(product.id)} disabled={reservePending}>
          <Users className="ms-1 size-4" />
          {t("wholesale.market.reserve")}
        </Button>
      )
    }
    if (readyForCheckout && product?.my_reservation?.id) {
      return (
        <Button className="w-full" asChild>
          <Link to={`/wholesale/checkout/${product.my_reservation.id}`}>
            {t("wholesale.market.goToCheckout")}
          </Link>
        </Button>
      )
    }
    if (isCompleted) {
      return (
        <Button className="w-full" variant="secondary" disabled>
          <CheckCircle2 className="ms-1 size-4" />
          {t("wholesale.market.completedAwaitCheckout")}
        </Button>
      )
    }

    return (
      <Button className="w-full" variant="secondary" disabled>
        {t("wholesale.market.reservationClosed")}
      </Button>
    )
  })()

  return (
    <Card className="group h-full overflow-hidden border-border/80 transition hover:border-primary/40 hover:shadow-md">
      <Link to={`/wholesale/product/${product.id}`} className="block">
        <div className="relative aspect-[4/3] bg-muted">
          {product?.media?.image_url ? (
            <img
              src={product.media.image_url}
              alt={product?.title ?? ""}
              className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Building2 className="size-8" />
            </div>
          )}
          <Badge variant="destructive" className={cn("absolute top-3", dir === "rtl" ? "right-3" : "left-3")}>
            {t("wholesale.market.discountBadge", { percent: product?.discount_percent ?? 0 })}
          </Badge>
        </div>
      </Link>
      <CardContent className={cn("flex h-[220px] flex-col justify-between space-y-3 p-4", dir === "rtl" ? "text-end" : "text-start")}>
        <div>
          <Link to={`/wholesale/product/${product.id}`} className="line-clamp-1 font-semibold hover:text-primary">
            {product?.title}
          </Link>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {product?.seller?.company?.name ?? product?.seller?.name ?? t("common.member")}
          </p>
        </div>

        <div className={cn("flex items-center gap-2", dir === "rtl" ? "justify-end" : "justify-start")}>
          <span className="text-xs text-muted-foreground line-through">
            {formatMoney(priceValue)}
          </span>
          <span className="text-lg font-bold text-primary">{formatMoney(wholesaleValue)}</span>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className={cn("flex items-center justify-between", dir === "rtl" ? "" : "flex-row-reverse")}>
            <span>{t("wholesale.market.remainingBuyers", { count: product?.remaining_needed ?? 0 })}</span>
            <span>{`${product?.current_buyers ?? 0}/${product?.min_quantity ?? 0}`}</span>
          </div>
          <Progress value={product?.progress_percentage ?? 0} className="h-1.5" />
        </div>

        {cta}
      </CardContent>
    </Card>
  )
}
