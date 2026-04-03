import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
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

function getListingStatusLabel(status) {
  const labels = { ALL: "الكل", ACTIVE: "نشط", SOLD: "مباع", HIDDEN: "مخفي" }
  return labels[status] ?? status
}

export function MyListingsPage() {
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
    duplicate,
  } = useMyListings()

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
  }, [searchInput])

  return (
    <div className="space-y-5" dir={direction}>
      {/* 1. Header row */}
      <div className="flex items-center justify-between">
        <Button size="sm" onClick={() => navigate("/add-listing")} className="gap-1.5">
          <Plus size={14} /> إضافة إعلان
        </Button>
        <div className="text-start">
          <h1 className="text-xl font-bold text-foreground">إعلاناتي</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {counts.all} إعلان إجمالاً
          </p>
        </div>
      </div>

      {/* 2. Status tabs */}
      <Tabs value={status} onValueChange={(v) => setFilter("status", v)}>
        <TabsList
          variant="line"
          className="w-full h-auto p-0 bg-transparent border-b border-border rounded-none"
        >
          {[
            { value: "ALL", label: "الكل", count: counts.all },
            { value: "ACTIVE", label: "نشط", count: counts.active },
            { value: "SOLD", label: "مباع", count: counts.sold },
            { value: "HIDDEN", label: "مخفي", count: counts.hidden },
          ].map((tab) => (
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
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* 3. Filters bar */}
      <div className="flex gap-2 items-center">
        <Select value={sort} onValueChange={(v) => setFilter("sort", v)}>
          <SelectTrigger className="w-36 shrink-0 h-9 text-xs">
            <SelectValue placeholder="الترتيب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">الأحدث</SelectItem>
            <SelectItem value="oldest">الأقدم</SelectItem>
            <SelectItem value="price_desc">السعر: الأعلى</SelectItem>
            <SelectItem value="price_asc">السعر: الأقل</SelectItem>
            <SelectItem value="views">الأكثر مشاهدة</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          {isFetching ? (
            <Loader2
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
            />
          ) : (
            <Search
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          )}
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ابحث في إعلاناتك..."
            dir={direction}
            className="pr-8 h-9 text-sm"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput("")
                setFilter("search", "")
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 4. Listings grid */}
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
              ? `لا توجد نتائج لـ "${search}"`
              : status === "ALL"
                ? "لا توجد إعلانات بعد"
                : `لا توجد إعلانات ${getListingStatusLabel(status)}`}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {search
              ? "جرب كلمة بحث مختلفة"
              : "أضف إعلانك الأول الآن وابدأ البيع"}
          </p>
          {!search && (
            <Button size="sm" onClick={() => navigate("/add-listing")}>
              <Plus size={14} className="me-1.5" /> إضافة إعلان
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
              onDuplicate={duplicate}
              onEdit={(id) => navigate(`/products/${id}/edit`)}
              onView={(id) => navigate(`/products/${id}`)}
            />
          ))}
        </div>
      )}

      {/* 5. Pagination */}
      {pagination && pagination.last_page > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {pagination.from}–{pagination.to} من {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setFilter("page", String(page - 1))}
            >
              <ChevronRight size={14} />
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
                    ...
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
            >
              <ChevronLeft size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* 6. Delete confirm dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogDescription className="text-right">
              هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الإعلان وجميع صوره بشكل
              نهائي.
            </AlertDialogDescription>
            <AlertDialogTitle className="text-right">
              هل أنت متأكد من حذف الإعلان؟
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
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
                "نعم، احذف الإعلان"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
