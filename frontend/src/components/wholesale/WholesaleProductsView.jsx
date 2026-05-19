import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { motion as Motion, useReducedMotion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, LayoutGrid, LayoutList } from "lucide-react"
import { cn } from "@/lib/utils"
import { persistWholesaleView } from "@/lib/wholesaleViewStorage"
import { WHOLESALE_LIST_ROW_HEIGHT, WHOLESALE_LIST_THUMB_WIDTH } from "@/components/feed/cards/ProductCard"
import { WholesaleProductCard } from "@/components/wholesale/WholesaleProductCard"
import { WholesaleFeedRow } from "@/components/wholesale/WholesaleFeedRow"

const VIEW_IDS = ["feed", "vertical"]

function ProductSkeleton({ layout }) {
  if (layout === "feed") {
    return (
      <div className={cn("flex animate-pulse border-b border-border bg-card", WHOLESALE_LIST_ROW_HEIGHT)}>
        <div className={cn("h-full bg-muted", WHOLESALE_LIST_THUMB_WIDTH)} />
        <div className="flex flex-1 flex-col justify-center gap-2 p-4">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      </div>
    )
  }
  return (
    <Card className="h-full min-w-0 overflow-hidden rounded-2xl border-border/60 shadow-sm">
      <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  )
}

const viewMeta = [
  { id: "feed", icon: LayoutList, labelKey: "wholesale.filters.viewFeed" },
  { id: "vertical", icon: LayoutGrid, labelKey: "wholesale.filters.viewVertical" },
]

export function WholesaleProductsView({
  view = "feed",
  onViewChange,
  products = [],
  totalResults = 0,
  isLoading = false,
  isError = false,
  pageDir = "rtl",
  onClearFilters,
  onReserve,
  onCancel,
  reservePendingProductId = null,
  cancelPendingProductId = null,
  user = null,
}) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const safeView = VIEW_IDS.includes(view) ? view : "feed"

  const skeletonCount = safeView === "vertical" ? 8 : 6
  const empty = !isLoading && !isError && products.length === 0

  return (
    <section id="wholesale-products" className="scroll-mt-20 space-y-0" dir={pageDir}>
      <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:mx-0 md:px-0">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">{t("wholesale.market.featuredProducts")}</h2>
              <span className="text-sm text-muted-foreground tabular-nums">
                {t("wholesale.filters.resultsCount", { count: totalResults })}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {user ? (
              <Button variant="outline" size="sm" asChild className="h-10 rounded-full px-4">
                <Link to="/wholesale/reservations">{t("wholesale.market.myReservations")}</Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild className="h-10 gap-2 rounded-full px-4">
              <Link to="/wholesale/companies">
                <Building2 className="size-4 shrink-0" aria-hidden />
                {t("wholesale.market.companiesList")}
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-4" role="tablist" aria-label={t("wholesale.filters.viewToggle")}>
          <div className="inline-flex w-full max-w-md rounded-full border border-border/80 bg-muted/40 p-1">
            {viewMeta.map((item) => {
              const { id, icon: IconComponent, labelKey } = item
              const active = safeView === id
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    if (!VIEW_IDS.includes(id)) return
                    persistWholesaleView(id)
                    onViewChange?.(id)
                  }}
                  className={cn(
                    "relative flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {!reduceMotion && active ? (
                    <Motion.span
                      layoutId="wholesaleViewPill"
                      className="absolute inset-0 rounded-full bg-background shadow-md ring-1 ring-border/50"
                      transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    />
                  ) : active ? (
                    <span className="absolute inset-0 rounded-full bg-background shadow-md ring-1 ring-border/50" />
                  ) : null}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <IconComponent className="size-4 shrink-0" aria-hidden />
                    <span>{t(labelKey)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="pt-6">
        {isError ? (
          <Card className="rounded-2xl border-destructive/30">
            <CardContent className="py-10 text-center text-sm text-destructive">
              {t("wholesale.filters.loadError")}
            </CardContent>
          </Card>
        ) : null}

        {empty ? (
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{t("wholesale.market.empty")}</p>
              {onClearFilters ? (
                <Button type="button" variant="outline" className="rounded-full" onClick={onClearFilters}>
                  {t("wholesale.filters.clearFiltersCta")}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {isLoading ? (
          safeView === "vertical" ? (
            <div className="wholesale-product-grid wholesale-product-grid--4">
              {[...Array(skeletonCount)].map((_, i) => (
                <ProductSkeleton key={i} layout="vertical" />
              ))}
            </div>
          ) : (
            <div className="bg-card">
              {[...Array(skeletonCount)].map((_, i) => (
                <ProductSkeleton key={i} layout="feed" />
              ))}
            </div>
          )
        ) : null}

        {!isLoading && !isError && products.length > 0 && safeView === "feed" ? (
          <div className="bg-card">
            {products.map((product) => (
              <WholesaleFeedRow
                key={product.id}
                product={product}
                user={user}
                t={t}
                onReserve={onReserve}
                onCancel={onCancel}
                reservePending={reservePendingProductId === product.id}
                cancelPending={cancelPendingProductId === product.id}
              />
            ))}
          </div>
        ) : null}

        {!isLoading && !isError && products.length > 0 && safeView === "vertical" ? (
          <div className="wholesale-product-grid wholesale-product-grid--4">
            {products.map((product) => (
              <WholesaleProductCard
                key={product.id}
                product={product}
                user={user}
                t={t}
                dir={pageDir}
                density="compact"
                onReserve={onReserve}
                onCancel={onCancel}
                reservePending={reservePendingProductId === product.id}
                cancelPending={cancelPendingProductId === product.id}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
