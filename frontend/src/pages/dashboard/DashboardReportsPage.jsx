import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { FileText, ExternalLink } from "lucide-react"
import apiClient from "@/lib/apiClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const REPORT_METRICS = ["views", "comments", "messages", "sales", "bids"]

export function DashboardReportsPage() {
  const { t } = useTranslation()
  const [metric, setMetric] = useState("views")

  const metricLabelMap = useMemo(
    () => ({
      views: t("dashboard.reportsPage.metric.mostViewed"),
      comments: t("dashboard.reportsPage.metric.mostCommented"),
      messages: t("dashboard.reportsPage.metric.mostMessaged"),
      sales: t("dashboard.reportsPage.metric.mostPurchased"),
      bids: t("dashboard.reportsPage.metric.mostOffers"),
    }),
    [t]
  )

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", "reports", metric],
    queryFn: async () => {
      const { data } = await apiClient.get("/account/reports", {
        params: { metric },
      })
      return Array.isArray(data?.data) ? data.data[0] : null
    },
  })

  const rows = Array.isArray(data?.listings) ? [...data.listings] : []
  rows.sort((a, b) => Number(b?.count ?? 0) - Number(a?.count ?? 0))

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 py-4 sm:py-6">
      <Card>
        <CardHeader className="gap-4 sm:flex sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              {t("dashboard.reportsPage.title")}
            </CardTitle>
            <CardDescription>{t("dashboard.reportsPage.subtitle")}</CardDescription>
          </div>
          <div className="w-full sm:w-72">
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_METRICS.map((m) => (
                  <SelectItem key={m} value={m}>{metricLabelMap[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : isError ? (
            <p className="text-sm text-destructive">{t("dashboard.reportsPage.loadError")}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.reportsPage.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dashboard.reportsPage.table.rank")}</TableHead>
                  <TableHead>{t("dashboard.reportsPage.table.product")}</TableHead>
                  <TableHead>{t("dashboard.reportsPage.table.value")}</TableHead>
                  <TableHead>{t("dashboard.reportsPage.table.topBid")}</TableHead>
                  <TableHead>{t("dashboard.reportsPage.table.link")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={`${row?.id ?? "row"}-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{row?.title || t("common.unknown")}</TableCell>
                    <TableCell>{Number(row?.count ?? 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {metric === "bids"
                        ? Number(row?.top_bid_amount ?? 0).toLocaleString()
                        : t("dashboard.reportsPage.notApplicable")}
                    </TableCell>
                    <TableCell>
                      {row?.id ? (
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/products/${row.id}`}>
                            <ExternalLink className="me-1 size-4" />
                            {t("dashboard.reportsPage.openProduct")}
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("dashboard.reportsPage.noLink")}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
