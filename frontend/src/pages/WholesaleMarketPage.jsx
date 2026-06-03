import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuthStore } from "@/store/useAuthStore"
import { useFiltersStore } from "@/store/useFiltersStore"
import { cancelWholesaleReservation, fetchWholesaleMarketProducts, reserveWholesaleProduct } from "@/services/wholesaleService"
import { useMainCategories } from "@/hooks/useCategories"
import { useRegions } from "@/hooks/useRegions"
import { useWholesaleFiltersSync } from "@/hooks/useWholesaleFiltersSync"
import { useWholesalePageSettings, useWholesaleCopyResolver } from "@/hooks/useWholesalePageSettings"
import { WholesaleProductsView } from "@/components/wholesale/WholesaleProductsView"
import { CategoryBar } from "@/components/home/CategoryBar"
import { SubcategoryBar } from "@/components/home/SubcategoryBar"
import { FilterToolbar } from "@/components/home/FilterToolbar"
import { AnnouncementStrip } from "@/components/home/AnnouncementStrip"
import { WholesaleMarketHero } from "@/components/wholesale/WholesaleMarketHero"
import { WholesaleHowItWorks } from "@/components/wholesale/WholesaleHowItWorks"
import { WholesaleTrustStrip } from "@/components/wholesale/WholesaleTrustStrip"
import { WholesaleQuickFilters } from "@/components/wholesale/WholesaleQuickFilters"
import {
  persistWholesaleView,
  readStoredWholesaleView,
  isWholesaleView,
  normalizeWholesaleViewParam,
} from "@/lib/wholesaleViewStorage"
import { getDirection } from "@/lib/direction"
import { isWholesaleProductOwner } from "@/lib/wholesaleAccess"
import {
  WholesaleReserveConfirmDialog,
  WholesaleCancelConfirmDialog,
} from "@/components/wholesale/WholesaleReservationDialogs"
import { WholesalePageShell } from "@/components/wholesale/WholesalePageShell"
import { SeoHead, SITE_URL } from "@/components/seo/SeoHead"
import { useResolvedSeo } from "@/hooks/useResolvedSeo"
import { buildCollectionPageSchema, mergeJsonLd } from "@/lib/seo/structuredData"

function patchSearchParams(prev, updates) {
  const next = new URLSearchParams(prev)
  Object.entries(updates).forEach(([k, v]) => {
    if (v === "" || v === null || v === undefined) next.delete(k)
    else next.set(k, String(v))
  })
  return next
}

function mapActiveFilterToSort(activeFilter) {
  if (activeFilter === "cheapest") return "price_asc"
  if (activeFilter === "most-viewed") return "popular"
  if (activeFilter === "most-sold") return "popular"
  return undefined
}

function buildWholesaleApiParams({
  searchQuery,
  categoryId,
  subcategoryId,
  regionId,
  cityId,
  activeFilter,
  groupStatus,
}) {
  const sort = mapActiveFilterToSort(activeFilter)
  const params = {}
  const q = searchQuery?.trim()
  if (q) params.search = q
  if (categoryId) params.category_id = categoryId
  if (subcategoryId) params.subcategory_id = subcategoryId
  if (regionId) params.region_id = regionId
  if (cityId) params.city_id = cityId
  if (sort) params.sort = sort
  if (groupStatus === "open" || groupStatus === "almost_full") params.group_status = groupStatus
  return params
}

export function WholesaleMarketPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [searchParams, setSearchParams] = useSearchParams()
  const pageDir = getDirection(i18n.language)

  useWholesaleFiltersSync()

  const categoryId = useFiltersStore((s) => s.categoryId)
  const subcategoryId = useFiltersStore((s) => s.subcategoryId)
  const regionId = useFiltersStore((s) => s.regionId)
  const cityId = useFiltersStore((s) => s.cityId)
  const searchQuery = useFiltersStore((s) => s.searchQuery)
  const activeFilter = useFiltersStore((s) => s.activeFilter)
  const resetFilters = useFiltersStore((s) => s.resetFilters)

  const groupStatus = searchParams.get("group_status") === "almost_full" || searchParams.get("group_status") === "open" ? searchParams.get("group_status") : ""

  const viewSyncedRef = useRef(false)
  useEffect(() => {
    if (viewSyncedRef.current) return
    viewSyncedRef.current = true
    if (!searchParams.has("view")) {
      const stored = readStoredWholesaleView()
      if (stored) {
        setSearchParams((prev) => patchSearchParams(prev, { view: stored }), { replace: true })
      }
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const raw = searchParams.get("view")
    if (!raw) return
    const normalized = normalizeWholesaleViewParam(raw)
    if (normalized !== raw) {
      setSearchParams((prev) => patchSearchParams(prev, { view: normalized }), { replace: true })
      if (isWholesaleView(normalized)) persistWholesaleView(normalized)
    }
  }, [searchParams, setSearchParams])

  const viewParam = searchParams.get("view")
  const view = isWholesaleView(normalizeWholesaleViewParam(viewParam)) ? normalizeWholesaleViewParam(viewParam) : "feed"

  const setView = useCallback(
    (v) => {
      const n = normalizeWholesaleViewParam(v)
      if (!isWholesaleView(n)) return
      persistWholesaleView(n)
      setSearchParams((prev) => patchSearchParams(prev, { view: n }), { replace: true })
    },
    [setSearchParams]
  )

  const apiParams = useMemo(
    () =>
      buildWholesaleApiParams({
        searchQuery,
        categoryId,
        subcategoryId,
        regionId,
        cityId,
        activeFilter,
        groupStatus,
      }),
    [searchQuery, categoryId, subcategoryId, regionId, cityId, activeFilter, groupStatus]
  )

  const apiKey = useMemo(() => JSON.stringify(apiParams), [apiParams])

  const productsQuery = useQuery({
    queryKey: ["wholesale", "market", apiKey, i18n.language],
    queryFn: () => fetchWholesaleMarketProducts(apiParams),
  })

  const [reserveDialog, setReserveDialog] = useState(null)
  const [cancelDialog, setCancelDialog] = useState(null)

  const { data: categories = [], isLoading: categoriesLoading } = useMainCategories()
  const { data: regions = [] } = useRegions()

  const reserveMutation = useMutation({
    mutationFn: ({ productId, quantity }) => reserveWholesaleProduct(productId, quantity),
    onSuccess: (res) => {
      setReserveDialog(null)
      if (res?.code === "already_reserved") {
        return
      }
      toast.success(res?.message ?? t("wholesale.market.reserveSuccess"))
      queryClient.invalidateQueries({ queryKey: ["wholesale", "market"] })
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
      queryClient.invalidateQueries({ queryKey: ["wholesale", "market"] })
      queryClient.invalidateQueries({ queryKey: ["wholesale", "my-reservations"] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("wholesale.market.cancelError"))
    },
  })

  const products = productsQuery.data?.data ?? []
  const totalResults = productsQuery.data?.meta?.total ?? products.length

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
    (product, quantity = 1) => {
      if (!user) {
        toast.error(t("wholesale.market.loginRequired"))
        navigate("/login")
        return
      }
      if (isWholesaleProductOwner(user, product)) {
        return
      }
      const q = Math.max(1, Math.min(Number(quantity) || 1, 10_000))
      const price = formatWholesaleUnit(product?.wholesale_price)
      setReserveDialog({
        productId: product.id,
        quantity: q,
        title: product?.title ?? "",
        priceLine: price ? t("wholesale.confirmReserve.priceLine", { price }) : null,
      })
    },
    [user, navigate, t, formatWholesaleUnit]
  )

  const openCancelConfirm = useCallback(
    (product) => {
      if (!user) {
        toast.error(t("wholesale.market.loginRequired"))
        navigate("/login")
        return
      }
      setCancelDialog({
        productId: product.id,
        title: product?.title ?? "",
      })
    },
    [user, navigate, t]
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
    reserveMutation.variables?.productId === reserveDialog.productId

  const cancelDialogPending =
    cancelMutation.isPending &&
    cancelDialog &&
    cancelMutation.variables === cancelDialog.productId

  const clearFilters = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  const pageSettingsQuery = useWholesalePageSettings()
  const ws = pageSettingsQuery.data
  const getCopy = useWholesaleCopyResolver(ws, i18n, t)
  const settingsReady = pageSettingsQuery.isSuccess

  const showHero = settingsReady && Boolean(ws?.show_hero)
  const showQuickFilters = settingsReady && Boolean(ws?.show_quick_filters)
  const showHowItWorks = settingsReady && Boolean(ws?.show_how_it_works)
  const showTrust = settingsReady && Boolean(ws?.show_trust)

  const seoQuery = useResolvedSeo("/wholesale")
  const seo = seoQuery.data
  const wholesaleJsonLd = mergeJsonLd(
    buildCollectionPageSchema({
      url: `${SITE_URL}/wholesale`,
      name: t("wholesale.market.title", "سوق الجملة"),
      description: seo?.description ?? "",
    }),
    seo?.json_ld?.length ? seo.json_ld : null
  )

  return (
    <section className="min-h-[400px] bg-background" dir={pageDir}>
      <SeoHead
        path="/wholesale"
        title={seo?.seo_title ?? t("wholesale.market.title", "سوق الجملة")}
        description={seo?.description}
        image={seo?.og?.image}
        hreflang={seo?.hreflang}
        jsonLd={wholesaleJsonLd}
        useTitleAsFull={Boolean(seo?.seo_title)}
      />
      <CategoryBar categories={categories} isLoading={categoriesLoading} />
      <SubcategoryBar categories={categories} />
      <FilterToolbar
        regions={regions}
        hideWholesaleLink
        inputDir={pageDir}
        searchPlaceholder={t("wholesale.filters.searchPlaceholder")}
      />
      <AnnouncementStrip target="individuals" queryKey="home-individuals" />

      {showHero ? <WholesaleMarketHero pageDir={pageDir} getCopy={getCopy} /> : null}
      {showQuickFilters ? (
        <WholesaleQuickFilters searchParams={searchParams} setSearchParams={setSearchParams} pageDir={pageDir} getCopy={getCopy} />
      ) : null}

      <WholesalePageShell className="space-y-6 py-6 md:py-8">
        <WholesaleProductsView
          view={view}
          onViewChange={setView}
          products={products}
          totalResults={totalResults}
          isLoading={productsQuery.isLoading}
          isError={productsQuery.isError}
          pageDir={pageDir}
          onClearFilters={clearFilters}
          onReserve={openReserveConfirm}
          onCancel={openCancelConfirm}
          reservePendingProductId={reserveMutation.isPending ? reserveMutation.variables?.productId : null}
          cancelPendingProductId={cancelMutation.isPending ? cancelMutation.variables : null}
          user={user}
        />
      </WholesalePageShell>

      {showHowItWorks ? <WholesaleHowItWorks pageDir={pageDir} getCopy={getCopy} /> : null}
      {showTrust ? <WholesaleTrustStrip pageDir={pageDir} getCopy={getCopy} innerClassName="max-w-[1440px]" /> : null}

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
    </section>
  )
}
