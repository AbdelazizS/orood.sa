import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import {
  cancelWholesaleReservation,
  fetchWholesaleProductDetails,
  reserveWholesaleProduct,
} from "@/services/wholesaleService"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { getDirection } from "@/lib/direction"
import {
  ListingTitle,
  ListingImages,
  ListingDescription,
  PublisherInfoNote,
  CommentsSection,
  ListingStatsRow,
  ShippingInfo,
  TrustBanner,
} from "@/components/listing-detail"
import { WholesaleDetailHeroSection } from "@/components/wholesale/WholesaleDetailHeroSection"
import { WholesaleListingActions } from "@/components/wholesale/WholesaleListingActions"
import { WholesaleDealMomentumStrip } from "@/components/wholesale/WholesaleDealMomentumStrip"
import { WholesaleRelatedDealsSection } from "@/components/wholesale/WholesaleRelatedDealsSection"
import {
  WholesaleReserveConfirmDialog,
  WholesaleCancelConfirmDialog,
} from "@/components/wholesale/WholesaleReservationDialogs"
import {
  hasActiveWholesaleReservation,
  isWholesaleProductOwner,
  isWholesaleReservationPaymentPending,
  isWholesaleReservationPurchased,
} from "@/lib/wholesaleAccess"
import { cn } from "@/lib/utils"

/**
 * Wholesale product detail — same shell and section order as ProductDetailsPage.
 * Hero → Title → Images → Description → Publisher → Actions → Momentum → Comments → Stats → Shipping → Extras → Trust
 */
export function WholesaleProductPage() {
  const { t, i18n } = useTranslation()
  const direction = getDirection(i18n.language)
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams()
  const viewTrackedRef = useRef(false)

  const [reserveQty, setReserveQty] = useState(1)
  const [reserveDialog, setReserveDialog] = useState(null)
  const [cancelDialog, setCancelDialog] = useState(null)

  const query = useQuery({
    queryKey: ["wholesale", "product", id],
    queryFn: () => fetchWholesaleProductDetails(id),
    enabled: Boolean(id),
  })
  const product = query.data?.data
  const isOwner = isWholesaleProductOwner(user, product)

  useEffect(() => {
    if (!product?.id) return
    const max = Math.max(1, Number(product.remaining_needed ?? 1))
    setReserveQty((q) => Math.min(Math.max(1, q), max))
  }, [product?.id, product?.remaining_needed])

  useEffect(() => {
    if (!id || !product?.id || isOwner || viewTrackedRef.current) return
    viewTrackedRef.current = true
    apiClient
      .post(`/products/${id}/view`, {
        platform: "web",
        source: "wholesale_product_details",
      })
      .catch(() => {})
  }, [id, product?.id, isOwner])

  const reserveMutation = useMutation({
    mutationFn: ({ productId, quantity }) => reserveWholesaleProduct(productId, quantity),
    onSuccess: (res) => {
      setReserveDialog(null)
      if (res?.code === "already_reserved") return
      toast.success(res?.message ?? t("wholesale.market.reserveSuccess"))
      queryClient.invalidateQueries({ queryKey: ["wholesale", "product", id] })
      queryClient.invalidateQueries({ queryKey: ["wholesale", "market"] })
      queryClient.invalidateQueries({ queryKey: ["wholesale", "related"] })
      queryClient.invalidateQueries({ queryKey: ["wholesale", "my-reservations"] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("wholesale.market.reserveError"))
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (productId) => cancelWholesaleReservation(productId),
    onSuccess: () => {
      setCancelDialog(null)
      toast.success(t("wholesale.market.cancelSuccess"))
      queryClient.invalidateQueries({ queryKey: ["wholesale", "product", id] })
      queryClient.invalidateQueries({ queryKey: ["wholesale", "market"] })
      queryClient.invalidateQueries({ queryKey: ["wholesale", "related"] })
      queryClient.invalidateQueries({ queryKey: ["wholesale", "my-reservations"] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("wholesale.market.cancelError"))
    },
  })

  const formatWholesaleUnit = useCallback(
    (value) => {
      const n = Number(value)
      if (!Number.isFinite(n) || n <= 0) return null
      const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-SA"
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "SAR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(n)
      } catch {
        return `${Math.round(n)} ${t("common.currency", "SAR")}`
      }
    },
    [i18n.language, t]
  )

  const openReserveConfirm = useCallback(
    (p, quantityFromCard) => {
      const target = p?.id ? p : product
      if (!target) return
      if (!user) {
        toast.error(t("wholesale.market.loginRequired"))
        navigate("/login")
        return
      }
      if (isWholesaleProductOwner(user, target)) return
      const max = Math.max(1, Number(target.remaining_needed ?? 1))
      const q =
        quantityFromCard != null && quantityFromCard !== undefined
          ? Math.max(1, Math.min(Number(quantityFromCard) || 1, max))
          : Math.max(1, Math.min(reserveQty, max))
      const price = formatWholesaleUnit(target.wholesale_price)
      setReserveDialog({
        productId: target.id,
        quantity: q,
        title: target.title ?? "",
        priceLine: price ? t("wholesale.confirmReserve.priceLine", { price }) : null,
      })
    },
    [product, user, navigate, t, reserveQty, formatWholesaleUnit]
  )

  const openCancelConfirm = useCallback(
    (p) => {
      const target = p?.id ? p : product
      if (!target) return
      if (!user) {
        toast.error(t("wholesale.market.loginRequired"))
        navigate("/login")
        return
      }
      setCancelDialog({ productId: target.id, title: target.title ?? "" })
    },
    [product, user, navigate, t]
  )

  const commitReserve = useCallback(() => {
    if (!reserveDialog) return
    reserveMutation.mutate({
      productId: reserveDialog.productId,
      quantity: reserveDialog.quantity,
    })
  }, [reserveDialog, reserveMutation])

  const commitCancel = useCallback(() => {
    if (!cancelDialog) return
    cancelMutation.mutate(cancelDialog.productId)
  }, [cancelDialog, cancelMutation])

  const reserveDialogPending =
    reserveMutation.isPending &&
    reserveDialog &&
    Number(reserveMutation.variables?.productId) === Number(reserveDialog.productId)

  const cancelDialogPending =
    cancelMutation.isPending &&
    cancelDialog &&
    Number(cancelMutation.variables) === Number(cancelDialog.productId)

  const reservePendingProduct = reserveMutation.isPending ? reserveMutation.variables?.productId : null
  const cancelPendingProduct = cancelMutation.isPending ? cancelMutation.variables : null

  const reservePendingMain = reserveMutation.isPending && reserveMutation.variables?.productId === Number(id)
  const cancelPendingMain = cancelMutation.isPending && cancelMutation.variables === Number(id)

  const remainingNeeded = Math.max(0, Number(product?.remaining_needed ?? 0))
  const isCompleted = Boolean(product?.campaign_completed)
  const hasActive = product ? hasActiveWholesaleReservation(product) : false
  const checkoutOpen = product ? isWholesaleReservationPaymentPending(product) : false
  const purchased = product ? isWholesaleReservationPurchased(product) : false
  const canReserve = Boolean(product && !hasActive && !isCompleted && remainingNeeded > 0 && !isOwner)
  const showMobileSticky =
    !isOwner &&
    product &&
    !purchased &&
    (canReserve || checkoutOpen || (hasActive && !checkoutOpen && !isCompleted))

  const stickyPriceLabel = product ? formatWholesaleUnit(product.wholesale_price) : null

  const relatedProps = {
    product,
    user,
    dir: direction,
  }

  if (query.isLoading || (!query.isError && !product)) {
    return (
      <div dir={direction} className="min-h-screen bg-background">
        <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-24 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,430px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,470px)]">
          <article className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center border-b border-border px-2 py-2 sm:px-4">
              <Skeleton className="h-11 w-24 rounded-md" />
            </div>
            <div className="space-y-3 border-b border-border px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="size-10 rounded-full" />
              </div>
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="space-y-4 border-b border-border px-4 py-4">
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
            </div>
            <div className="space-y-4 px-4 py-4">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          </article>
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
              <Skeleton className="mb-4 h-5 w-32" />
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            </div>
          </aside>
        </main>
      </div>
    )
  }

  if (query.isError || !product) {
    return (
      <section className="min-h-[300px] bg-background px-4 pb-10 pt-6 sm:px-6" dir={direction}>
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              {t("nav.home")}
            </Link>
            <span>/</span>
            <Link to="/wholesale" className="hover:text-foreground">
              {t("wholesale.market.title")}
            </Link>
          </div>
          <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {t("wholesale.product.notFound")}
          </p>
        </div>
      </section>
    )
  }

  return (
    <div dir={direction} className="min-h-screen bg-background">
      <main
        className={cn(
          "mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,430px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,470px)]",
          showMobileSticky ? "pb-28" : "pb-24"
        )}
      >
        <article className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center border-b border-border px-2 py-2 sm:px-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-[44px] gap-2 text-base"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
              {t("common.back", "رجوع")}
            </Button>
          </div>

          <WholesaleDetailHeroSection product={product} />
          <ListingTitle product={product} />
          <ListingImages product={product} />
          <ListingDescription product={product} />
          <PublisherInfoNote product={product} />

          <WholesaleListingActions
            product={product}
            user={user}
            reserveQty={reserveQty}
            onReserveQtyChange={setReserveQty}
            onReserveClick={() => openReserveConfirm()}
            onCancelClick={() => openCancelConfirm()}
            reservePending={reservePendingMain}
            cancelPending={cancelPendingMain}
          />

          <WholesaleDealMomentumStrip product={product} dir={direction} participants={product?.participants ?? []} />
          <CommentsSection product={product} />
          <ListingStatsRow product={product} />
          <ShippingInfo product={product} />
          <TrustBanner />
        </article>

        <aside className="hidden min-w-0 lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <WholesaleRelatedDealsSection {...relatedProps} variant="sidebar" />
          </div>
        </aside>
      </main>

      <div className="lg:hidden">
        <WholesaleRelatedDealsSection {...relatedProps} variant="default" />
      </div>

      {showMobileSticky ? (
        <div
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden dark:shadow-[0_-8px_24px_rgba(0,0,0,0.35)]"
          role="region"
          aria-label={t("wholesale.pdp.mobileDealBarLabel")}
        >
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div className="min-w-0 text-start">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("wholesale.detail.heroWholesaleCaption")}
              </p>
              <p className="truncate text-lg font-bold tabular-nums text-primary">{stickyPriceLabel ?? "—"}</p>
            </div>
            <div className="shrink-0">
              {checkoutOpen && product?.my_reservation?.id ? (
                <Button className="min-h-12 min-w-[9.5rem] rounded-xl text-base font-semibold" asChild>
                  <Link to={`/wholesale/checkout/${product.my_reservation.id}`}>{t("wholesale.market.goToCheckout")}</Link>
                </Button>
              ) : canReserve ? (
                <Button
                  type="button"
                  className="min-h-12 min-w-[9.5rem] rounded-xl text-base font-semibold"
                  onClick={() => openReserveConfirm()}
                  disabled={reservePendingMain}
                >
                  {t("wholesale.market.reserve")}
                </Button>
              ) : (
                <Button variant="secondary" className="min-h-12 min-w-[9.5rem] rounded-xl text-base font-semibold" asChild>
                  <Link to="/wholesale/reservations">{t("wholesale.pdp.mobileReservationCta")}</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <WholesaleReserveConfirmDialog
        open={Boolean(reserveDialog)}
        onOpenChange={(open) => {
          if (!open) setReserveDialog(null)
        }}
        title={reserveDialog?.title ?? ""}
        quantity={reserveDialog?.quantity ?? 1}
        priceLine={reserveDialog?.priceLine}
        onConfirm={commitReserve}
        pending={reserveDialogPending}
      />
      <WholesaleCancelConfirmDialog
        open={Boolean(cancelDialog)}
        onOpenChange={(open) => {
          if (!open) setCancelDialog(null)
        }}
        title={cancelDialog?.title ?? ""}
        onConfirm={commitCancel}
        pending={cancelDialogPending}
      />
    </div>
  )
}
