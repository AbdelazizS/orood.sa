import { cn } from "@/lib/utils"
import { WholesaleProductCard } from "@/components/wholesale/WholesaleProductCard"

/**
 * Same grid rhythm as wholesale market vertical view — use on company profile and similar.
 */
export function WholesaleProductGrid({
  products = [],
  user,
  t,
  dir = "rtl",
  onReserve,
  onCancel,
  reservePendingProductId = null,
  cancelPendingProductId = null,
  className,
  maxColumns = 3,
  density = "compact",
}) {
  if (!products.length) return null

  return (
    <div
      className={cn(
        "wholesale-product-grid",
        maxColumns >= 4 && "wholesale-product-grid--4",
        className
      )}
      dir={dir}
    >
      {products.map((product) => (
        <WholesaleProductCard
          key={product.id}
          product={product}
          user={user}
          t={t}
          dir={dir}
          density={density}
          onReserve={onReserve}
          onCancel={onCancel}
          reservePending={reservePendingProductId === product.id}
          cancelPending={cancelPendingProductId === product.id}
        />
      ))}
    </div>
  )
}
