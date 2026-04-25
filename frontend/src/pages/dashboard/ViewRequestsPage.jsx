import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { ar, enUS } from "date-fns/locale"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import apiClient from "@/lib/apiClient"
import { useAccountSectionBasePath } from "@/lib/accountSectionPaths"
import { toast } from "sonner"
import { MapPin } from "lucide-react"

function statusVariant(status) {
  if (status === "APPROVED") return "default"
  if (status === "DECLINED" || status === "CANCELLED") return "destructive"
  return "secondary"
}

const viewReqKeys = {
  outgoing: ["account", "view-requests", "outgoing"],
  incoming: ["account", "view-requests", "incoming"],
}

export function ViewRequestsPage() {
  const { t, i18n } = useTranslation()
  const { direction } = useAppDirection()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const basePath = useAccountSectionBasePath()
  const locale = i18n.language === "ar" ? ar : enUS
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get("tab") === "incoming" ? "incoming" : "outgoing"

  const setTab = (value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === "incoming") next.set("tab", "incoming")
      else next.delete("tab")
      return next
    })
  }

  const { data: outgoingData, isLoading: loadingOut } = useQuery({
    queryKey: viewReqKeys.outgoing,
    queryFn: async () => {
      const { data: body } = await apiClient.get("/account/view-requests")
      return body
    },
  })

  const { data: incomingData, isLoading: loadingIn } = useQuery({
    queryKey: viewReqKeys.incoming,
    queryFn: async () => {
      const { data: body } = await apiClient.get("/account/view-requests/incoming")
      return body
    },
  })

  const outgoingRows = outgoingData?.data ?? []
  const incomingRows = incomingData?.data ?? []

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["account", "view-requests"] })
  }

  const cancelMutation = useMutation({
    mutationFn: async (id) => apiClient.patch(`/view-requests/${id}`, { status: "CANCELLED" }),
    onSuccess: () => {
      invalidateAll()
      toast.success(t("viewRequests.cancelled", "تم إلغاء الطلب"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.errorGeneric"))
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => apiClient.patch(`/view-requests/${id}`, { status }),
    onSuccess: () => {
      invalidateAll()
      toast.success(t("viewRequests.updated", "تم التحديث"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.errorGeneric"))
    },
  })

  const openMessageSeller = (productId) => {
    if (!productId) return
    navigate(`${basePath}/messages?product=${productId}`)
  }

  const openMessageBuyer = (recipientId) => {
    if (!recipientId) return
    navigate(`${basePath}/messages?with=${recipientId}`)
  }

  const renderOutgoingRow = (row) => {
    const dt = row.scheduled_date ? new Date(row.scheduled_date) : null
    const dateLabel = dt ? format(dt, "PPp", { locale }) : "—"
    const pid = row.product_id ?? row.product?.id
    const pending = row.status === "PENDING"
    const canMessageSeller = pid && (row.status === "PENDING" || row.status === "APPROVED")

    return (
      <li key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(row.status)}>{t(`viewRequests.status.${row.status}`, row.status)}</Badge>
            <span className="text-xs text-muted-foreground">{dateLabel}</span>
          </div>
          <Link to={pid ? `/products/${pid}` : "#"} className="font-medium text-primary hover:underline">
            {row.product?.title ?? t("viewRequests.listing", "إعلان")}
          </Link>
          {row.location_address ? <p className="truncate text-xs text-muted-foreground">{row.location_address}</p> : null}
          {row.seller_note ? <p className="text-xs text-muted-foreground">{row.seller_note}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canMessageSeller ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => openMessageSeller(pid)}
            >
              {t("viewRequests.messageSeller")}
            </Button>
          ) : null}
          {pending ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate(row.id)}
            >
              {t("viewRequests.cancel", "إلغاء الطلب")}
            </Button>
          ) : null}
        </div>
      </li>
    )
  }

  const renderIncomingRow = (row) => {
    const dt = row.scheduled_date ? new Date(row.scheduled_date) : null
    const dateLabel = dt ? format(dt, "PPp", { locale }) : "—"
    const pid = row.product_id ?? row.product?.id
    const pending = row.status === "PENDING"
    const requesterId = row.requester_id ?? row.requester?.id

    return (
      <li key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(row.status)}>{t(`viewRequests.status.${row.status}`, row.status)}</Badge>
            <span className="text-xs text-muted-foreground">{dateLabel}</span>
          </div>
          <Link to={pid ? `/products/${pid}` : "#"} className="font-medium text-primary hover:underline">
            {row.product?.title ?? t("viewRequests.listing", "إعلان")}
          </Link>
          {row.requester?.name ? (
            <p className="text-xs text-muted-foreground">
              {row.requester.name}
              {row.requester.username ? ` (@${row.requester.username})` : ""}
            </p>
          ) : null}
          {row.location_address ? <p className="truncate text-xs text-muted-foreground">{row.location_address}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {requesterId ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => openMessageBuyer(requesterId)}
            >
              {t("viewRequests.messageBuyer")}
            </Button>
          ) : null}
          {pending ? (
            <>
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ id: row.id, status: "APPROVED" })}
              >
                {t("viewRequests.approve")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ id: row.id, status: "DECLINED" })}
              >
                {t("viewRequests.decline")}
              </Button>
            </>
          ) : null}
        </div>
      </li>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6" dir={direction}>
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <MapPin className="size-6" />
          {t("viewRequests.pageTitle")}
        </h1>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full max-w-3xl">
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="outgoing" className="flex-1">
            {t("viewRequests.tabOutgoing")}
          </TabsTrigger>
          <TabsTrigger value="incoming" className="flex-1">
            {t("viewRequests.tabIncoming")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="outgoing" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">{t("viewRequests.buyerSubtitle")}</p>
          {loadingOut ? (
            <Skeleton className="h-48 w-full" />
          ) : outgoingRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("viewRequests.buyerEmpty")}</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">{outgoingRows.map(renderOutgoingRow)}</ul>
          )}
        </TabsContent>
        <TabsContent value="incoming" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">{t("viewRequests.sellerSubtitle")}</p>
          {loadingIn ? (
            <Skeleton className="h-48 w-full" />
          ) : incomingRows.length > 0 ? (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">{incomingRows.map(renderIncomingRow)}</ul>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
