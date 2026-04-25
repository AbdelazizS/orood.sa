import { useMemo, useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import apiClient from "@/lib/apiClient"
import { Loader2, Search, Landmark } from "lucide-react"

export function AdminFinancialGuaranteesPage() {
  const { t } = useTranslation()
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)

  useEffect(() => {
    const tmr = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => clearTimeout(tmr)
  }, [searchInput])

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", "guarantee-held", debouncedSearch, page, perPage],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set("guarantee", "held")
      params.set("page", String(page))
      params.set("per_page", String(perPage))
      if (debouncedSearch) params.set("search", debouncedSearch)
      const { data: res } = await apiClient.get(`/admin/users?${params.toString()}`)
      return res ?? {}
    },
  })

  const rows = data?.data ?? []
  const meta = data?.meta ?? {}

  const columns = useMemo(
    () => [
      {
        id: "id",
        header: "ID",
        cell: ({ row }) => <span className="font-mono text-xs">#{row.original.id}</span>,
      },
      {
        id: "name",
        header: t("admin.name", "Name"),
        cell: ({ row }) => (
          <Link to={`/admin/users/${row.original.id}`} className="font-medium text-primary hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "email",
        header: t("auth.email", "Email"),
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span>,
      },
      {
        id: "guarantee",
        header: t("guarantee.title", "Guarantee"),
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">
            {Number(row.original.financial_guarantee ?? 0).toLocaleString()} {t("common.currency")}
          </span>
        ),
      },
    ],
    [t],
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-w-0 w-full space-y-6">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.financialGuaranteesTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin.financialGuaranteesDesc")}</p>
        </div>
        <div className="relative min-w-0 w-full max-w-xs">
          <Search className="absolute start-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-8"
            placeholder={t("admin.search")}
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="size-4" />
            {t("admin.financialGuaranteesTable")}
          </CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 overflow-x-auto p-0">
          <DataTable
            columns={columns}
            data={rows}
            pagination
            manualPagination
            pageSize={perPage}
            pageCount={meta.last_page ?? 1}
            pageIndex={page - 1}
            onPageChange={(idx) => setPage(idx + 1)}
            onPageSizeChange={(n) => {
              setPerPage(n)
              setPage(1)
            }}
            total={meta.total ?? 0}
          />
        </CardContent>
      </Card>
    </div>
  )
}
