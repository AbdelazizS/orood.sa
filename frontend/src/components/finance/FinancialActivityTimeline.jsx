import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import apiClient from "@/lib/apiClient"

const STATUS_VARIANT = {
  pending: "secondary",
  approved: "default",
  completed: "default",
  rejected: "destructive",
}

export function FinancialActivityTimeline() {
  const { t, i18n } = useTranslation()
  const [statusFilter, setStatusFilter] = useState("")
  const [detail, setDetail] = useState(null)

  const { data, isLoading, refetch, isError } = useQuery({
    queryKey: ["account", "financial-activity", statusFilter],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/account/financial-activity", {
        params: statusFilter ? { status: statusFilter } : {},
      })
      return res?.data ?? []
    },
  })

  const items = data ?? []
  const locale = i18n.language?.startsWith("en") ? "en" : "ar"

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          <p>{t("common.error")}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            {t("common.retry", "Retry")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="flex flex-wrap gap-2">
        {["", "pending", "completed", "rejected"].map((s) => (
          <Button
            key={s || "all"}
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
            onClick={() => setStatusFilter(s)}
          >
            {s ? t(`dashboard.requestStatus.${s}`, s) : t("common.all", "All")}
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("analytics.noData", "No data")}</p>
      ) : (
        <ol className="relative space-y-4 border-s border-border ps-4">
          {items.map((item) => (
            <li key={item.id} className="relative">
              <span className="absolute -start-[21px] top-1.5 size-2.5 rounded-full bg-primary" />
              <Card className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => setDetail(item)}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{locale === "en" ? item.title_en : item.title_ar}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.created_at ? new Date(item.created_at).toLocaleString(locale) : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold tabular-nums">
                      {Number(item.amount).toLocaleString()} {item.currency ?? t("common.currency")}
                    </span>
                    <Badge variant={STATUS_VARIANT[item.status] ?? "outline"}>{item.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}

      {detail ? (
        <Dialog open onOpenChange={(o) => !o && setDetail(null)}>
          <DialogContent className="max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{locale === "en" ? detail.title_en : detail.title_ar}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p>
                {t("dashboard.amount")}: {Number(detail.amount).toLocaleString()} {detail.currency}
              </p>
              {detail.meta?.rejection_reason ? (
                <p className="text-destructive">{detail.meta.rejection_reason}</p>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
