import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { ar, enUS } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { toast } from "sonner"
import { MapPin } from "lucide-react"

function statusVariant(status) {
  if (status === "APPROVED") return "default"
  if (status === "DECLINED" || status === "CANCELLED") return "destructive"
  return "secondary"
}

export function ViewRequestsSellerPanel({ productId, enabled }) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const locale = i18n.language === "ar" ? ar : enUS

  const { data, isLoading } = useQuery({
    queryKey: ["product", productId, "view-requests"],
    queryFn: async () => {
      const { data: body } = await apiClient.get(`/products/${productId}/view-requests`)
      return body
    },
    enabled: Boolean(enabled && productId),
  })

  const rows = data?.data ?? []

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, seller_note }) => {
      const { data: body } = await apiClient.patch(`/view-requests/${id}`, { status, seller_note })
      return body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId, "view-requests"] })
      toast.success(t("viewRequests.updated", "تم التحديث"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.errorGeneric"))
    },
  })

  if (!enabled || !productId) return null
  if (!isLoading && rows.length === 0) return null

  return (
    <Card className="mx-4 mt-4 sm:mx-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="size-4" />
          {t("viewRequests.sellerTitle", "طلبات المعاينة في موقع المشتري")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {rows.map((row) => {
              const dt = row.scheduled_date ? new Date(row.scheduled_date) : null
              const dateLabel = dt ? format(dt, "PPp", { locale }) : "—"
              const pending = row.status === "PENDING"
              return (
                <li key={row.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(row.status)}>{t(`viewRequests.status.${row.status}`, row.status)}</Badge>
                      <span className="text-xs text-muted-foreground">{dateLabel}</span>
                    </div>
                    <p className="text-sm font-medium">
                      {row.requester?.name ?? row.requester?.username ?? "—"}
                    </p>
                    {row.location_address ? (
                      <p className="truncate text-xs text-muted-foreground">{row.location_address}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {pending ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          disabled={updateMutation.isPending}
                          onClick={() => updateMutation.mutate({ id: row.id, status: "APPROVED" })}
                        >
                          {t("viewRequests.approve", "موافقة")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={updateMutation.isPending}
                          onClick={() => updateMutation.mutate({ id: row.id, status: "DECLINED" })}
                        >
                          {t("viewRequests.decline", "رفض")}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
