import { useMemo, useState, useCallback, useEffect } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useAuthStore } from "@/store/useAuthStore"
import {
  cancelWholesaleReservation,
  fetchWholesaleCompanyDetails,
  fetchWholesaleCompanyProducts,
  reserveWholesaleProduct,
} from "@/services/wholesaleService"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { WholesaleCompanyHero } from "@/components/wholesale/WholesaleCompanyHero"
import { WholesaleCompanyMapSection } from "@/components/wholesale/WholesaleCompanyMapSection"
import { WholesaleProductGrid } from "@/components/wholesale/WholesaleProductGrid"
import { WholesalePageShell } from "@/components/wholesale/WholesalePageShell"
import {
  WholesaleReserveConfirmDialog,
  WholesaleCancelConfirmDialog,
} from "@/components/wholesale/WholesaleReservationDialogs"
import { isWholesaleProductOwner } from "@/lib/wholesaleAccess"
import { getDirection, isRtlLanguage } from "@/lib/direction"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

const sortOptions = ["newest", "price_asc", "price_desc", "discount"]

export function WholesaleCompanyPage() {
  const { t, i18n } = useTranslation()
  const dir = getDirection(i18n.language)
  const isRTL = isRtlLanguage(i18n.language)
  const navigate = useNavigate()
  const CrumbIcon = isRTL ? ChevronLeft : ChevronRight
  const { id } = useParams()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [draftSearch, setDraftSearch] = useState("")
  const [submittedSearch, setSubmittedSearch] = useState("")
  const [sort, setSort] = useState("newest")
  const [page, setPage] = useState(1)

  const submitSearch = useCallback(() => {
    setSubmittedSearch(draftSearch.trim())
    setPage(1)
  }, [draftSearch])

  const params = useMemo(
    () => ({
      search: submittedSearch || undefined,
      sort,
      per_page: 24,
      page,
    }),
    [submittedSearch, sort, page]
  )

  useEffect(() => {
    setPage(1)
  }, [submittedSearch, sort])

  const [reserveDialog, setReserveDialog] = useState(null)
  const [cancelDialog, setCancelDialog] = useState(null)

  const companyQuery = useQuery({
    queryKey: ["wholesale", "company", id],
    queryFn: () => fetchWholesaleCompanyDetails(id),
    enabled: Boolean(id),
  })
  const productsQuery = useQuery({
    queryKey: ["wholesale", "company", id, "products", params],
    queryFn: () => fetchWholesaleCompanyProducts(id, params),
    enabled: Boolean(id),
  })

  const reserveMutation = useMutation({
    mutationFn: ({ productId, quantity }) => reserveWholesaleProduct(productId, quantity),
    onSuccess: (res) => {
      setReserveDialog(null)
      if (res?.code === "already_reserved") return
      toast.success(t("wholesale.market.reserveSuccess"))
      queryClient.invalidateQueries({ queryKey: ["wholesale", "company", id, "products"] })
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
      queryClient.invalidateQueries({ queryKey: ["wholesale", "company", id, "products"] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("wholesale.market.cancelError"))
    },
  })

  const company = companyQuery.data?.data?.company
  const featuredProductId =
    companyQuery.data?.data?.featured_products?.[0]?.id ?? productsQuery.data?.data?.[0]?.id ?? null
  const products = productsQuery.data?.data ?? []
  const meta = productsQuery.data?.meta ?? {}
  const lastPage = Math.max(1, Number(meta.last_page ?? 1))
  const currentPage = Math.min(lastPage, Math.max(1, Number(meta.current_page ?? page)))

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
      if (isWholesaleProductOwner(user, product)) return
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
      setCancelDialog({ productId: product.id, title: product?.title ?? "" })
    },
    [user, navigate, t]
  )

  const commitReserve = useCallback(() => {
    if (!reserveDialog) return
    reserveMutation.mutate({ productId: reserveDialog.productId, quantity: reserveDialog.quantity })
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

  const reservePendingProductId = reserveMutation.isPending ? reserveMutation.variables?.productId : null
  const cancelPendingProductId = cancelMutation.isPending ? cancelMutation.variables : null

  return (
    <section className="min-h-[400px] bg-background pb-10 pt-4 md:pt-6" dir={dir}>
      <WholesalePageShell className="space-y-2 pb-4">
        <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            {t("nav.home")}
          </Link>
          <CrumbIcon className="size-4 shrink-0" />
          <Link to="/wholesale" className="hover:text-foreground">
            {t("wholesale.market.title")}
          </Link>
          <CrumbIcon className="size-4 shrink-0" />
          <Link to="/wholesale/companies" className="hover:text-foreground">
            {t("wholesale.companies.title")}
          </Link>
          <CrumbIcon className="size-4 shrink-0" />
          <span className="min-w-0 max-w-[min(100%,28rem)] truncate font-medium text-foreground">{company?.name ?? t("wholesale.companyProfile.title")}</span>
        </div>
      </WholesalePageShell>

      <WholesalePageShell className="space-y-6 py-4 md:py-6">
        {companyQuery.isLoading ? (
          <Card className="overflow-hidden rounded-3xl border-border/60">
            <div className="h-32 animate-pulse bg-muted/50 sm:h-36" />
            <div className="space-y-4 p-6">
              <div className="h-20 w-20 animate-pulse rounded-full bg-muted/50" />
              <div className="h-8 w-2/3 max-w-sm animate-pulse rounded-lg bg-muted/50" />
              <div className="h-4 w-1/2 max-w-xs animate-pulse rounded bg-muted/40" />
            </div>
            <div className="grid grid-cols-2 gap-px border-t border-border/60 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse bg-muted/30" />
              ))}
            </div>
          </Card>
        ) : company ? (
          <WholesaleCompanyHero company={company} t={t} dir={dir} featuredProductId={featuredProductId} />
        ) : null}

        {company ? <WholesaleCompanyMapSection company={company} dir={dir} /> : null}

        {company?.description?.trim() ? (
          <p className="wholesale-type-body max-w-3xl text-start text-muted-foreground">{company.description.trim()}</p>
        ) : null}

        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_220px]">
            <div className="flex min-w-0 overflow-hidden rounded-md border border-input">
              <Input
                type="search"
                className="h-11 flex-1 rounded-none border-0 focus-visible:ring-0"
                placeholder={t("wholesale.companyProfile.search")}
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    submitSearch()
                  }
                }}
                dir={dir}
              />
              <Button
                type="button"
                onClick={submitSearch}
                size="icon"
                className="h-11 w-11 shrink-0 rounded-none"
                aria-label={t("feed.search", "بحث")}
              >
                <Search className="size-4" />
              </Button>
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger>
                <SelectValue placeholder={t("wholesale.market.sortLabel")} />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {t(`wholesale.market.sort.${opt}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {productsQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-72 animate-pulse rounded-2xl bg-muted/40" />
            ))}
          </div>
        ) : (
          <WholesaleProductGrid
            products={products}
            user={user}
            t={t}
            dir={dir}
            maxColumns={4}
            density="compact"
            onReserve={openReserveConfirm}
            onCancel={openCancelConfirm}
            reservePendingProductId={reservePendingProductId}
            cancelPendingProductId={cancelPendingProductId}
          />
        )}

        {products.length === 0 && !productsQuery.isLoading ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">{t("wholesale.companyProfile.empty")}</CardContent>
          </Card>
        ) : null}

        {lastPage > 1 ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              {t("wholesale.companies.prevPage")}
            </Button>
            <span className="px-2 text-sm text-muted-foreground tabular-nums">
              {t("wholesale.companies.pageIndicator", { current: currentPage, last: lastPage })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= lastPage}
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            >
              {t("wholesale.companies.nextPage")}
            </Button>
          </div>
        ) : null}
      </WholesalePageShell>

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
