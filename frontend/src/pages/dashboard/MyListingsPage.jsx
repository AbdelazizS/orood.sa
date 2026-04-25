import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMyListings } from "@/hooks/useMyListings"
import { useAppDirection } from "@/providers/DirectionProvider"
import { ListingCard } from "@/components/dashboard/ListingCard"
import { ListingCardSkeleton } from "@/components/dashboard/ListingCardSkeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { Plus, Search, X, List, Loader2, ChevronLeft, ChevronRight } from "lucide-react"

export function MyListingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { direction } = useAppDirection()
  const {
    listings,
    counts,
    pagination,
    status,
    search,
    sort,
    page,
    setFilter,
    isLoading,
    isFetching,
    toggleStatus,
    bump,
    deleteListing,
    markSold,
  } = useMyListings()
  const handleDuplicateToAdd = (listing) => {
    if (!listing) return
    const imageUrls = Array.isArray(listing.images)
      ? listing.images.map((img) => img?.url).filter(Boolean)
      : (listing.thumbnail ? [listing.thumbnail] : [])
    navigate("/add", {
      state: {
        duplicateFrom: {
          type: String(listing.type || "OFFER").toLowerCase() === "request" ? "request" : "offer",
          title: listing.title ?? "",
          description: listing.description ?? "",
          price: listing.price ?? "",
          accept_bids: Boolean(listing.options?.bidding_enabled),
          bids_visible: listing.options?.bidding_visible !== false,
          category_id: listing.main_category?.id ?? null,
          subcategory_id: listing.sub_category?.id ?? null,
          region_id: listing.region?.id ?? null,
          city_id: listing.city?.id ?? null,
          image_urls: imageUrls,
          contact_preferences: {
            messages: listing.options?.contact_by_message !== false,
            phone: Boolean(listing.options?.contact_by_call),
            phone_number: listing.options?.contact_phone ?? "",
          },
          shipping_details: {
            free_shipping: Boolean(listing.options?.free_shipping),
            free_return: Boolean(listing.options?.free_return_days > 0),
            view_at_client: Boolean(listing.options?.view_at_location),
          },
        },
      },
    })
  }


  const tabDefs = useMemo(
    () => [
      { value: "ALL", labelKey: "dashboard.listingsPage.tabAll", count: counts.all },
      { value: "ACTIVE", labelKey: "dashboard.listingsPage.tabActive", count: counts.active },
      { value: "SOLD", labelKey: "dashboard.listingsPage.tabSold", count: counts.sold },
      { value: "HIDDEN", labelKey: "dashboard.listingsPage.tabHidden", count: counts.hidden },
    ],
    [counts.all, counts.active, counts.sold, counts.hidden]
  )

  const filterLabelForEmpty = useMemo(() => {
    const row = tabDefs.find((x) => x.value === status)
    return row ? t(row.labelKey) : status
  }, [status, tabDefs, t])

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [searchInput, setSearchInput] = useState(search)

  useEffect(() => {
    setSearchInput(search)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter("search", searchInput)
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce search only when searchInput changes
  }, [searchInput])

  return (
    <div className="space-y-5" dir={direction}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-start">
          <h1 className="text-xl font-bold text-foreground">{t("dashboard.listingsPage.title")}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("dashboard.listingsPage.countTotal", { count: counts.all })}
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/add")} className="gap-1.5 shrink-0 self-start sm:self-center">
          <Plus size={14} /> {t("dashboard.listingsPage.addListing")}
        </Button>
      </div>

      <Tabs value={status} onValueChange={(v) => setFilter("status", v)}>
        <TabsList
          variant="line"
          className="w-full h-auto p-0 bg-transparent border-b border-border rounded-none"
        >
          {tabDefs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "flex-1 rounded-none border-b-2 border-transparent",
                "data-[state=active]:border-primary",
                "data-[state=active]:bg-transparent",
                "data-[state=active]:text-primary",
                "data-[state=active]:font-semibold",
                "pb-3 pt-2 text-sm gap-1.5",
                "transition-colors"
              )}
            >
              {tab.count > 0 && (
                <Badge
                  variant={status === tab.value ? "default" : "secondary"}
                  className="text-xs h-4 min-w-4 px-1 rounded-full"
                >
                  {tab.count}
                </Badge>
              )}
              {t(tab.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={sort} onValueChange={(v) => setFilter("sort", v)}>
          <SelectTrigger className="w-full sm:w-36 shrink-0 h-9 text-xs">
            <SelectValue placeholder={t("dashboard.listingsPage.sortPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("dashboard.listingsPage.sortNewest")}</SelectItem>
            <SelectItem value="oldest">{t("dashboard.listingsPage.sortOldest")}</SelectItem>
            <SelectItem value="price_desc">{t("dashboard.listingsPage.sortPriceDesc")}</SelectItem>
            <SelectItem value="price_asc">{t("dashboard.listingsPage.sortPriceAsc")}</SelectItem>
            <SelectItem value="views">{t("dashboard.listingsPage.sortViews")}</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-0">
          {isFetching ? (
            <Loader2
              size={14}
              className="absolute top-1/2 start-3 -translate-y-1/2 animate-spin text-muted-foreground"
            />
          ) : (
            <Search
              size={14}
              className="absolute top-1/2 start-3 -translate-y-1/2 text-muted-foreground"
            />
          )}
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("dashboard.listingsPage.searchPlaceholder")}
            dir="auto"
            className="ps-8 pe-8 h-9 text-sm"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("")
                setFilter("search", "")
              }}
              className="absolute top-1/2 end-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={t("common.close")}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && listings.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <List size={28} className="text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground mb-1">
            {search
              ? t("dashboard.listingsPage.emptyNoResults", { query: search })
              : status === "ALL"
                ? t("dashboard.listingsPage.emptyNoListings")
                : t("dashboard.listingsPage.emptyNoListingsForFilter", { filter: filterLabelForEmpty })}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? t("dashboard.listingsPage.emptyTrySearch") : t("dashboard.listingsPage.emptyAddFirst")}
          </p>
          {!search && (
            <Button size="sm" onClick={() => navigate("/add")}>
              <Plus size={14} className="me-1.5" /> {t("dashboard.listingsPage.addListing")}
            </Button>
          )}
        </div>
      )}

      {!isLoading && listings.length > 0 && (
        <div className="space-y-3">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onToggleStatus={toggleStatus}
              onBump={bump}
              onDelete={(id) => setDeleteTarget(id)}
              onMarkSold={markSold}
              onDuplicate={handleDuplicateToAdd}
              onEdit={(id) => navigate(`/products/${id}/edit`)}
              onView={(id) => navigate(`/products/${id}`)}
            />
          ))}
        </div>
      )}

      {pagination && pagination.last_page > 1 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
          <p className="text-xs text-muted-foreground text-start">
            {t("dashboard.listingsPage.paginationRange", {
              from: pagination.from,
              to: pagination.to,
              total: pagination.total,
            })}
          </p>
          <div className="flex items-center justify-center sm:justify-end gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setFilter("page", String(page - 1))}
              aria-label={t("dashboard.listingsPage.prevPage")}
            >
              <ChevronLeft className="size-3.5 rtl:rotate-180" />
            </Button>
            {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === pagination.last_page ||
                  Math.abs(p - page) <= 1
              )
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) {
                  acc.push("...")
                }
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="px-1 text-muted-foreground text-sm"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={page === p ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => setFilter("page", String(p))}
                  >
                    {p}
                  </Button>
                )
              )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= pagination.last_page}
              onClick={() => setFilter("page", String(page + 1))}
              aria-label={t("dashboard.listingsPage.nextPage")}
            >
              <ChevronRight className="size-3.5 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent dir={direction} className="text-start">
          <AlertDialogHeader className="text-start sm:text-start">
            <AlertDialogTitle>{t("dashboard.listingsPage.deleteDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.listingsPage.deleteDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteListing.mutate(deleteTarget)
                setDeleteTarget(null)
              }}
            >
              {deleteListing.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                t("dashboard.listingsPage.deleteDialogConfirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
