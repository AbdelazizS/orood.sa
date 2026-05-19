import { useMemo, useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { ar, enUS } from "date-fns/locale"
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  ExternalLink,
  Loader2,
} from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { useAppDirection } from "@/providers/DirectionProvider"
import { CompanyWholesaleProductsTableSkeleton } from "@/components/wholesale/CompanyWholesaleProductsTableSkeleton"
import { cn } from "@/lib/utils"

const STATUS_OPTIONS = ["published", "pending_review", "suspended", "sold"]

function labelStatus(t, status) {
  if (status == null || status === "") return "—"
  return t(`dashboard.status.${status}`, { defaultValue: String(status) })
}

function formatMoney(value, currency) {
  if (value == null || value === "") return "—"
  return `${value} ${currency}`
}

/**
 * @param {Object} props
 * @param {Array} props.products
 * @param {{ current_page?: number, last_page?: number, per_page?: number, total?: number }} props.meta
 * @param {boolean} props.isLoading
 * @param {boolean} props.isFetching
 * @param {number} props.page
 * @param {number} props.perPage
 * @param {string} props.search
 * @param {string} props.statusFilter
 * @param {(page: number) => void} props.onPageChange
 * @param {(perPage: number) => void} props.onPerPageChange
 * @param {(search: string) => void} props.onSearchChange
 * @param {(status: string) => void} props.onStatusFilterChange
 * @param {() => void} props.onRefresh
 * @param {(product: object) => void} props.onEdit
 * @param {(id: number|string) => void} props.onDelete
 * @param {boolean} props.isDeleting
 */
export function CompanyWholesaleProductsTable({
  products,
  meta,
  isLoading,
  isFetching,
  page,
  perPage,
  search,
  statusFilter,
  onPageChange,
  onPerPageChange,
  onSearchChange,
  onStatusFilterChange,
  onRefresh,
  onEdit,
  onDelete,
  isDeleting,
}) {
  const { t, i18n } = useTranslation()
  const { direction } = useAppDirection()
  const dateLocale = i18n.language?.startsWith("ar") ? ar : enUS
  const currency = t("common.currency", "SAR")
  const [searchInput, setSearchInput] = useState(search)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    setSearchInput(search)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) onSearchChange(searchInput)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, search, onSearchChange])

  const columns = useMemo(
    () => [
      {
        id: "image",
        header: t("wholesale.company.table.image"),
        cell: ({ row }) => {
          const p = row.original
          const url = p.media?.image_url || p.media?.gallery?.[0]
          return url ? (
            <img src={url} alt="" className="h-12 w-12 rounded-md object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-md bg-muted" />
          )
        },
      },
      {
        id: "title",
        header: t("wholesale.company.table.title"),
        cell: ({ row }) => {
          const p = row.original
          return (
            <Link
              to={`/wholesale/product/${p.id}`}
              className="font-medium hover:underline inline-block max-w-[220px] text-start break-words"
            >
              {p.title}
            </Link>
          )
        },
      },
      {
        id: "category",
        header: t("wholesale.company.table.category"),
        cell: ({ row }) => {
          const cat = row.original.category?.name
          const sub = row.original.subcategory?.name
          if (!cat) return "—"
          return sub ? `${cat} — ${sub}` : cat
        },
      },
      {
        id: "originalPrice",
        header: t("wholesale.company.table.originalPrice"),
        cell: ({ row }) => formatMoney(row.original.price, currency),
      },
      {
        id: "wholesalePrice",
        header: t("wholesale.company.table.wholesalePrice"),
        cell: ({ row }) => formatMoney(row.original.wholesale_price, currency),
      },
      {
        id: "discount",
        header: t("wholesale.company.table.discount"),
        cell: ({ row }) => {
          const pct = row.original.discount_percent
          return pct != null ? `${pct}%` : "—"
        },
      },
      {
        id: "groupTarget",
        header: t("wholesale.company.table.groupTarget"),
        cell: ({ row }) => row.original.min_quantity ?? "—",
      },
      {
        id: "progress",
        header: t("wholesale.company.table.progress"),
        cell: ({ row }) => {
          const p = row.original
          const reserved = Number(p.reserved_seats ?? p.current_buyers ?? 0)
          const min = Number(p.min_quantity ?? 0)
          const pct = Number(p.progress_percentage ?? (min > 0 ? Math.round((reserved / min) * 100) : 0))
          return (
            <div className="min-w-[120px] space-y-1">
              <p className="text-xs text-muted-foreground">
                {t("wholesale.company.table.progressSeats", { reserved, min })}
              </p>
              <Progress value={pct} className="h-1.5" />
            </div>
          )
        },
      },
      {
        id: "status",
        header: t("wholesale.company.table.status"),
        cell: ({ row }) => (
          <Badge variant={row.original.status === "published" ? "default" : "outline"}>
            {labelStatus(t, row.original.status)}
          </Badge>
        ),
      },
      {
        id: "expires",
        header: t("wholesale.company.table.expires"),
        cell: ({ row }) => {
          const raw = row.original.wholesale_expires_at
          if (!raw) return "—"
          try {
            return format(new Date(raw), "PP", { locale: dateLocale })
          } catch {
            return String(raw).slice(0, 10)
          }
        },
      },
      {
        id: "actions",
        header: t("wholesale.company.table.actions"),
        cell: ({ row }) => {
          const p = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t("wholesale.company.table.actions")}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(p)}>
                  <Pencil className="me-2 size-4" />
                  {t("wholesale.company.table.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/wholesale/product/${p.id}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="me-2 size-4" />
                    {t("wholesale.company.table.viewDeal")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteTarget(p)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="me-2 size-4" />
                  {t("wholesale.company.table.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [t, currency, dateLocale, onEdit],
  )

  const showSkeleton = isLoading || (isFetching && products.length === 0)
  const lastPage = meta?.last_page ?? 1
  const total = meta?.total ?? 0

  if (showSkeleton) {
    return <CompanyWholesaleProductsTableSkeleton />
  }

  return (
    <>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{t("wholesale.company.myProducts")}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isFetching}
              className="gap-1.5"
            >
              <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
              {t("wholesale.company.table.refresh")}
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                placeholder={t("wholesale.company.table.searchPlaceholder")}
                dir="auto"
                className="ps-8 h-9"
              />
            </div>
            <Select
              value={statusFilter || "all"}
              onValueChange={(v) => {
                onStatusFilterChange(v === "all" ? "" : v)
                onPageChange(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-44 h-9">
                <SelectValue placeholder={t("wholesale.company.table.statusFilter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {labelStatus(t, s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:px-6 sm:pb-6">
          {products.length === 0 ? (
            <div className="px-6 pb-8 pt-2 text-center">
              <p className="text-sm font-medium text-foreground">{t("wholesale.company.empty")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("wholesale.company.table.emptyHint")}</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={products}
              pagination
              manualPagination
              pageSize={perPage}
              pageCount={lastPage}
              pageIndex={page - 1}
              onPageChange={(idx) => onPageChange(idx + 1)}
              onPageSizeChange={onPerPageChange}
              total={total}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir={direction} className="text-start">
          <AlertDialogHeader className="text-start sm:text-start">
            <AlertDialogTitle>{t("wholesale.company.table.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("wholesale.company.table.deleteDescription", { title: deleteTarget?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                if (deleteTarget?.id) onDelete(deleteTarget.id)
                setDeleteTarget(null)
              }}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("wholesale.company.table.deleteConfirm")
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
