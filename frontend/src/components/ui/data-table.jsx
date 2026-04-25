import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Columns } from "lucide-react"

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

/**
 * Reusable DataTable using TanStack Table.
 * @param {Object} props
 * @param {import('@tanstack/react-table').ColumnDef[]} props.columns
 * @param {any[]} props.data
 * @param {boolean} [props.pagination=true]
 * @param {number} [props.pageSize=10]
 * @param {boolean} [props.manualPagination=false] - Server-side pagination
 * @param {number} [props.pageCount] - Total pages (for manual pagination)
 * @param {number} [props.pageIndex] - Current page 0-based (for manual pagination)
 * @param {function} [props.onPageChange] - (pageIndex) => void (for manual pagination)
 * @param {function} [props.onPageSizeChange] - (pageSize) => void (for manual pagination)
 * @param {number} [props.total] - Total items (for manual pagination)
 */
export function DataTable({
  columns,
  data,
  pagination = true,
  pageSize = 10,
  manualPagination = false,
  pageCount,
  pageIndex = 0,
  onPageChange,
  onPageSizeChange,
  total,
}) {
  const { t } = useTranslation()
  const [columnVisibility, setColumnVisibility] = useState({})
  const [sorting, setSorting] = useState([])
  const safeManualPageIndex = Number.isFinite(pageIndex) ? pageIndex : 0
  const tableState = manualPagination
    ? { columnVisibility, sorting, pagination: { pageIndex: safeManualPageIndex, pageSize } }
    : { columnVisibility, sorting }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: pagination && !manualPagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    manualPagination: manualPagination,
    pageCount: manualPagination ? (pageCount ?? 1) : undefined,
    state: tableState,
    initialState: pagination && !manualPagination ? { pagination: { pageSize } } : undefined,
  })
  const clientPageIndex = table.getState().pagination?.pageIndex ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns className="me-2 size-4" />
              {t("admin.columns", "Columns")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(v) => col.toggleVisibility(!!v)}
                >
                  {col.columnDef.header ?? col.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <p className="text-sm font-medium text-muted-foreground">{t("admin.noResults", "No results.")}</p>
                    <p className="text-xs text-muted-foreground">{t("admin.tryAdjustingFilters", "Try adjusting your filters or search.")}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2 py-2">
          <div className="flex flex-wrap items-center gap-4">
            {manualPagination && onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("admin.rowsPerPage", "Rows per page")}</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    onPageSizeChange(Number(v))
                    onPageChange?.(0)
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
            {manualPagination
              ? t("admin.pageOf", "Page {{current}} of {{total}}", { current: safeManualPageIndex + 1, total: pageCount ?? 1 })
              : t("admin.pageOf", "Page {{current}} of {{total}}", { current: clientPageIndex + 1, total: table.getPageCount() })}
            {manualPagination && total != null && ` (${t("admin.itemsTotal", "items")}: ${total})`}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {manualPagination && onPageChange ? (
              <>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(0)} disabled={safeManualPageIndex <= 0}>
                  <ChevronsLeft className="size-4 rtl:rotate-180" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(safeManualPageIndex - 1)} disabled={safeManualPageIndex <= 0}>
                  <ChevronLeft className="size-4 rtl:rotate-180" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(safeManualPageIndex + 1)} disabled={safeManualPageIndex >= (pageCount ?? 1) - 1}>
                  <ChevronRight className="size-4 rtl:rotate-180" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange((pageCount ?? 1) - 1)} disabled={safeManualPageIndex >= (pageCount ?? 1) - 1}>
                  <ChevronsRight className="size-4 rtl:rotate-180" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                  <ChevronsLeft className="size-4 rtl:rotate-180" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                  <ChevronLeft className="size-4 rtl:rotate-180" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                  <ChevronRight className="size-4 rtl:rotate-180" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                  <ChevronsRight className="size-4 rtl:rotate-180" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
