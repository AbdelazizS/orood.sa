import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import apiClient from "@/lib/apiClient"

export function AdminBidDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "bids", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/admin/bids/${id}`)
      return data?.data
    },
    enabled: Boolean(id),
  })

  if (isLoading) return <div className="flex items-center justify-center p-10"><Loader2 className="size-8 animate-spin" /></div>
  if (!data) return <p className="text-sm text-muted-foreground">{t("common.empty", "No data")}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("admin.bidDetails", "Bid details")} #{data.id}</h1>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/bids">{t("common.back", "Back")}</Link>
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>{t("admin.bidOverview", "Overview")}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>{t("admin.status", "Status")}:</strong> <Badge variant="secondary">{data.status}</Badge></p>
          <p><strong>{t("admin.price", "Amount")}:</strong> {Math.round(Number(data.amount ?? 0)).toLocaleString()} {t("common.currency")}</p>
          <p><strong>{t("admin.product", "Product")}:</strong> {data.product?.title ?? "—"}</p>
          <p><strong>{t("admin.buyer", "Buyer")}:</strong> {data.buyer?.name ?? data.user?.username ?? "—"}</p>
          <p><strong>{t("admin.order", "Order")}:</strong> {data.order?.id ? `#${data.order.id}` : "—"}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("admin.auditTimeline", "Audit timeline")}</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>{t("admin.bidCreatedAt", "Bid created")}: {data.audit?.bid_created_at ?? "—"}</p>
          <p>{t("admin.bidAcceptedAt", "Bid accepted")}: {data.audit?.accepted_at ?? "—"}</p>
          <p>{t("admin.bidRejectedAt", "Bid rejected")}: {data.audit?.rejected_at ?? "—"}</p>
          <p>{t("admin.bidWithdrawnAt", "Bid withdrawn")}: {data.audit?.withdrawn_at ?? "—"}</p>
          <p>{t("admin.notificationCount", "Notifications")}: {data.audit?.notification_count ?? 0}</p>
        </CardContent>
      </Card>
    </div>
  )
}
