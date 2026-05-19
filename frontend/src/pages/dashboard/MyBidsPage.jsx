import { Suspense, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StandardLocationMapField } from "@/components/maps/StandardLocationMapField"
import { normalizeSaudiPhone, saudiPhoneFieldError, SAUDI_PHONE_INPUT_PROPS } from "@/lib/phone/saudiPhone"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { Eye, EyeOff, Gavel, Loader2, MessageSquare, Package, Trash2 } from "lucide-react"
import { toast } from "sonner"

function statusVariant(status) {
  if (status === "ACCEPTED") return "default"
  if (status === "REJECTED") return "destructive"
  if (status === "WITHDRAWN") return "outline"
  return "secondary"
}

function formatBidAmount(value, language, currencyLabel) {
  const amount = Math.round(Number(value ?? 0))
  const locale = language === "ar" ? "ar-SA" : "en-US"
  return `${new Intl.NumberFormat(locale).format(amount)} ${currencyLabel}`
}

export function MyBidsPage({ embedded = false } = {}) {
  const { t, i18n } = useTranslation()
  const { user, token } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const focusBid = Number(searchParams.get("bid"))
  const requestedTab = String(searchParams.get("tab") || "").toLowerCase()
  const initialTab = requestedTab === "received" ? "received" : "sent"
  const [activeTab, setActiveTab] = useState(initialTab)
  const [withdrawBid, setWithdrawBid] = useState(null)
  const [rejectBid, setRejectBid] = useState(null)
  const [createOrderBid, setCreateOrderBid] = useState(null)
  const [searchText, setSearchText] = useState("")
  const [orderForm, setOrderForm] = useState({
    payment_method: "escrow",
    buyer_name: "",
    buyer_phone: "",
    shipping_address: "",
    shipping_lat: "",
    shipping_lng: "",
    buyer_note: "",
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["account", "bids"],
    queryFn: async () => {
      const { data } = await apiClient.get("/account/bids")
      return data
    },
  })
  const incomingQuery = useQuery({
    queryKey: ["account", "bids", "incoming"],
    queryFn: async () => {
      const { data } = await apiClient.get("/account/bids/incoming")
      return data
    },
  })
  const { data: balancePayload } = useQuery({
    queryKey: ["account", "balance"],
    queryFn: async () => {
      const { data } = await apiClient.get("/account/balance")
      return data?.data
    },
    enabled: Boolean(token),
  })

  const withdrawMutation = useMutation({
    mutationFn: async ({ productId, bidId }) => {
      await apiClient.delete(`/products/${productId}/bids/${bidId}`)
    },
    onSuccess: async () => {
      setWithdrawBid(null)
      await queryClient.invalidateQueries({ queryKey: ["account", "bids"] })
      toast.success(t("bids.withdrawn"))
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("common.errorGeneric"))
    },
  })

  const visibilityMutation = useMutation({
    mutationFn: async ({ productId, bidId }) => {
      await apiClient.patch(`/products/${productId}/bids/${bidId}/visibility`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["account", "bids"] })
      toast.success(t("bids.visibilityUpdated"))
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("common.errorGeneric"))
    },
  })
  const createOrderMutation = useMutation({
    mutationFn: async ({ bidId, payload }) => {
      const { data } = await apiClient.post(`/account/bids/${bidId}/create-order`, payload)
      return data
    },
    onSuccess: async (res) => {
      const newOrderId = res?.data?.id
      await queryClient.invalidateQueries({ queryKey: ["account", "bids"] })
      await queryClient.invalidateQueries({ queryKey: ["account", "orders"] })
      if (newOrderId) {
        await queryClient.invalidateQueries({ queryKey: ["account", "orders", String(newOrderId)] })
      }
      setCreateOrderBid(null)
      toast.success(t("bids.completeOrderSuccess"))
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? t("common.errorGeneric"))
    },
  })
  const acceptMutation = useMutation({
    mutationFn: async ({ productId, bidId }) => apiClient.post(`/products/${productId}/bids/${bidId}/accept`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["account", "bids"] })
      await queryClient.invalidateQueries({ queryKey: ["account", "bids", "incoming"] })
      toast.success(t("bids.acceptSuccess"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.errorGeneric")),
  })
  const rejectMutation = useMutation({
    mutationFn: async ({ productId, bidId }) => apiClient.post(`/products/${productId}/bids/${bidId}/reject`),
    onSuccess: async () => {
      setRejectBid(null)
      await queryClient.invalidateQueries({ queryKey: ["account", "bids"] })
      await queryClient.invalidateQueries({ queryKey: ["account", "bids", "incoming"] })
      toast.success(t("bids.rejectSuccess"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.errorGeneric")),
  })

  const sentRows = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data])
  const incomingRows = useMemo(
    () => (Array.isArray(incomingQuery.data?.data) ? incomingQuery.data.data : []),
    [incomingQuery.data]
  )

  const sortedSentRows = useMemo(() => {
    const rows = sentRows.map((row) => ({ ...row, _source: "sent" }))
    const list = [...rows]
    if (Number.isFinite(focusBid) && focusBid > 0) {
      list.sort((a, b) => {
        const aF = Number(a.id) === focusBid ? 1 : 0
        const bF = Number(b.id) === focusBid ? 1 : 0
        return bF - aF
      })
    }
    return list
  }, [sentRows, focusBid])

  const createOrderAmount = Number(createOrderBid?.amount ?? 0)
  const availableBalance = Number(balancePayload?.available ?? 0)
  const escrowShortfall =
    orderForm.payment_method === "escrow" && createOrderAmount > 0
      ? Math.max(0, createOrderAmount - availableBalance)
      : 0
  const escrowBlocked = orderForm.payment_method === "escrow" && escrowShortfall > 0
  const orderFormErrors = useMemo(() => {
    const errors = {}
    const buyerName = String(orderForm.buyer_name ?? "").trim()
    const buyerPhone = String(orderForm.buyer_phone ?? "").trim()
    const shippingAddress = String(orderForm.shipping_address ?? "").trim()
    const buyerNote = String(orderForm.buyer_note ?? "")

    if (!buyerName) {
      errors.buyer_name = t("purchase.validation.nameRequired", "يرجى إدخال الاسم.")
    } else if (buyerName.length < 2) {
      errors.buyer_name = t("purchase.validation.nameMin", "الاسم يجب أن يكون حرفين على الأقل.")
    } else if (buyerName.length > 255) {
      errors.buyer_name = t("purchase.validation.nameMax", "الاسم طويل جدًا (الحد 255 حرفًا).")
    }

    const phoneError = saudiPhoneFieldError(buyerPhone, t)
    if (phoneError) errors.buyer_phone = phoneError

    if (shippingAddress.length > 500) {
      errors.shipping_address = t("purchase.validation.addressMax", "العنوان طويل جدًا (الحد 500 حرف).")
    } else if (orderForm.payment_method === "cod" && shippingAddress.length < 5) {
      errors.shipping_address = t(
        "purchase.validation.addressCodMin",
        "للدفع عند الاستلام أدخل عنوان شحن كامل (5 أحرف على الأقل).",
      )
    }

    if (buyerNote.length > 2000) {
      errors.buyer_note = t("purchase.validation.noteMax", "الملاحظات طويلة جدًا (الحد 2000 حرف).")
    }

    return errors
  }, [orderForm.buyer_name, orderForm.buyer_note, orderForm.buyer_phone, orderForm.payment_method, orderForm.shipping_address, t])
  const orderFormInvalid = Object.keys(orderFormErrors).length > 0
  const sortedIncomingRows = useMemo(
    () => [...incomingRows].map((row) => ({ ...row, _source: "received" })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [incomingRows]
  )
  const filteredSentRows = useMemo(() => {
    const needle = searchText.trim().toLowerCase()
    if (!needle) return sortedSentRows
    return sortedSentRows.filter((row) => String(row?.product?.title ?? "").toLowerCase().includes(needle))
  }, [sortedSentRows, searchText])
  const filteredIncomingRows = useMemo(() => {
    const needle = searchText.trim().toLowerCase()
    if (!needle) return sortedIncomingRows
    return sortedIncomingRows.filter((row) => String(row?.product?.title ?? "").toLowerCase().includes(needle))
  }, [sortedIncomingRows, searchText])
  const currencyLabel = t("common.currency")
  const renderSentList = (rowsToRender, emptyMessageKey = "bids.myBidsEmptySent") => {
    if (rowsToRender.length === 0) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t(emptyMessageKey, t("bids.myBidsEmpty"))}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="default">
              <Link to="/">{t("bids.exploreListings", "Browse listings and place your first bid")}</Link>
            </Button>
          </div>
        </div>
      )
    }
    return (
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {rowsToRender.map((row) => {
          const pid = row.product?.id ?? row.product_id ?? row.listing_id
          const sellerId = row.product?.seller?.id
          const isFocused = Number(row.id) === focusBid
          const canWithdraw = row.status === "PENDING" && pid && row.id
          const bidsVisible = row.product?.bids_visible !== false
          const canToggleVisibility =
            row.status === "PENDING" && pid && row.id && bidsVisible && row.product?.accept_bids
          const order = row.order
          const canCreateOrder = row.status === "ACCEPTED" && !order?.id && Boolean(row.can_create_order)
          return (
            <li key={`sent-${row.id}`} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${isFocused ? "bg-primary/5" : ""}`}>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(row.status)}>{t(`bids.status.${row.status}`, row.status)}</Badge>
                  <span className="text-xs text-muted-foreground">{row.created_at ? new Date(row.created_at).toLocaleString() : ""}</span>
                </div>
                <p className="font-medium">{row.product?.title ?? t("viewRequests.listing", "إعلان")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("bids.yourBid")}: {formatBidAmount(row.amount, i18n.language, currencyLabel)}
                </p>
                {row.status === "ACCEPTED" && !order?.id ? <p className="text-[11px] text-muted-foreground">{t("bids.acceptedOrderMissingHint")}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {row.status === "ACCEPTED" && order?.id ? (
                  <Button asChild size="sm" className="gap-1">
                    <Link to={`/dashboard/orders/${order.id}`}><Package className="size-3.5" />{t("bids.openOrder", "Open order")}</Link>
                  </Button>
                ) : null}
                {canCreateOrder ? (
                  <Button type="button" variant="default" size="sm" className="gap-1" disabled={createOrderMutation.isPending} onClick={() => {
                    setCreateOrderBid(row)
                    setOrderForm((prev) => ({
                      ...prev,
                      payment_method: "escrow",
                      buyer_name: user?.name ?? "",
                      buyer_phone: user?.phone ?? "",
                      shipping_address: row.product?.location ?? "",
                      shipping_lat: "",
                      shipping_lng: "",
                      buyer_note: "",
                    }))
                  }}>
                    {createOrderMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Package className="size-3.5" />}
                    {t("bids.completeOrder", "Complete order")}
                  </Button>
                ) : null}
                <Button asChild variant="secondary" size="sm"><Link to={pid ? `/products/${pid}` : "/"}>{t("notifications.actions.openListing")}</Link></Button>
                {row.status === "PENDING" && pid ? <Button asChild variant="outline" size="sm"><Link to={`/products/${pid}#bids-section`}>{t("bids.raiseBidOnListing", "Raise bid on listing")}</Link></Button> : null}
                {sellerId ? <Button asChild variant="outline" size="sm" className="gap-1"><Link to={`/dashboard/messages?with=${sellerId}`}><MessageSquare className="size-3.5" />{t("bids.messageSeller")}</Link></Button> : null}
                {canToggleVisibility ? (
                  <Button type="button" variant="outline" size="sm" className="gap-1" disabled={visibilityMutation.isPending} onClick={() => visibilityMutation.mutate({ productId: pid, bidId: row.id })}>
                    {row.is_visible === false ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    {row.is_visible === false ? t("bids.showBid") : t("bids.hideBid")}
                  </Button>
                ) : null}
                {canWithdraw ? <Button type="button" variant="destructive" size="sm" className="gap-1" onClick={() => setWithdrawBid({ productId: pid, bidId: row.id })}><Trash2 className="size-3.5" />{t("bids.withdraw")}</Button> : null}
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  const renderReceivedList = (rowsToRender) => {
    if (rowsToRender.length === 0) return <p className="text-sm text-muted-foreground">{t("bids.sellerBidsEmptyOwned", t("bids.sellerBidsEmpty", "No incoming bids yet."))}</p>
    return (
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {rowsToRender.map((row) => {
          const pid = row?.product?.id ?? row?.product_id
          const bidId = row?.id
          const buyer = row?.buyer?.username || row?.buyer?.name || "—"
          return (
            <li key={`in-${row.id}`} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(row.status)}>{t(`bids.status.${row.status}`, row.status)}</Badge>
                  <span className="text-xs text-muted-foreground">{row.created_at ? new Date(row.created_at).toLocaleString() : ""}</span>
                </div>
                <p className="font-medium">{row?.product?.title ?? t("viewRequests.listing", "Listing")}</p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>{buyer}</span>
                  <span aria-hidden="true" className="opacity-70">
                    •
                  </span>
                  <span className="tabular-nums" dir="ltr">
                    {formatBidAmount(row.amount, i18n.language, currencyLabel)}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.order?.id ? <Button asChild size="sm" className="gap-1"><Link to={`/dashboard/orders/${row.order.id}`}><Package className="size-3.5" />{t("bids.openOrder")}</Link></Button> : null}
                {pid && row?.can_accept ? <Button type="button" size="sm" disabled={acceptMutation.isPending || rejectMutation.isPending} onClick={() => acceptMutation.mutate({ productId: pid, bidId })}>{acceptMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}{t("bids.acceptBid")}</Button> : null}
                {pid && row?.can_reject ? <Button type="button" variant="outline" size="sm" onClick={() => setRejectBid({ productId: pid, bidId })}>{t("bids.rejectBid")}</Button> : null}
                {row?.buyer?.id ? <Button asChild variant="outline" size="sm" className="gap-1"><Link to={`/dashboard/messages?with=${row.buyer.id}`}><MessageSquare className="size-3.5" />{t("bids.messageBuyer")}</Link></Button> : null}
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className={embedded ? "space-y-4" : "space-y-6 p-4 md:p-6"}>
      {!embedded && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <Gavel className="size-6" />
              {t("bids.myBidsTitle")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("bids.myBidsHubSubtitle")}</p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/dashboard/orders">
              <Package className="size-3.5" />
              {t("bids.trackOrders", "Order tracking")}
            </Link>
          </Button>
        </div>
      )}
      <div className="relative max-w-md">
        <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder={t("common.search", "Search")} />
      </div>
      {!embedded && (
        <p className="text-xs text-muted-foreground">
          {t("bids.incomingOwnerNote", "Incoming bids are shown only for listings owned by this account.")}
        </p>
      )}

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : isError ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">
            {error?.response?.status === 401
              ? t("bids.myBidsAuthError", "انتهت الجلسة أو تبدّل الحساب. سجّل الدخول مجددًا.")
              : error?.response?.data?.message ??
                error?.message ??
                t("bids.myBidsLoadError", "تعذّر تحميل عروضك. تحقق من الاتصال أو جرّب تسجيل الدخول مجددًا.")}
          </p>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/login">{t("auth.login", "تسجيل الدخول")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/">{t("common.home", "الرئيسية")}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="sent">{t("bids.tabs.sent", "Sent")}</TabsTrigger>
            <TabsTrigger value="received">{t("bids.tabs.received", "Received")}</TabsTrigger>
          </TabsList>
          <TabsContent value="sent">{renderSentList(filteredSentRows, "bids.myBidsEmptySent")}</TabsContent>
          <TabsContent value="received">
            {incomingQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : incomingQuery.isError ? (
              <p className="text-sm text-destructive">
                {incomingQuery.error?.response?.status === 403
                  ? t("bids.sellerBidsForbidden", "You do not have permission to review incoming bids.")
                  : incomingQuery.error?.response?.data?.message ?? incomingQuery.error?.message ?? t("common.errorGeneric")}
              </p>
            ) : (
              renderReceivedList(filteredIncomingRows)
            )}
          </TabsContent>
        </Tabs>
      )}

      <AlertDialog open={Boolean(withdrawBid)} onOpenChange={(open) => !open && setWithdrawBid(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bids.withdrawConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("bids.withdrawConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={withdrawMutation.isPending}
              onClick={() => {
                if (!withdrawBid) return
                withdrawMutation.mutate({ productId: withdrawBid.productId, bidId: withdrawBid.bidId })
              }}
            >
              {withdrawMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("bids.withdraw")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(rejectBid)} onOpenChange={(open) => !open && setRejectBid(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bids.rejectConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("bids.rejectConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={() => {
                if (!rejectBid) return
                rejectMutation.mutate(rejectBid)
              }}
            >
              {rejectMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("bids.rejectBid")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(createOrderBid)} onOpenChange={(open) => !open && setCreateOrderBid(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bids.completeOrder")}</AlertDialogTitle>
            <AlertDialogDescription>{t("bids.completeOrderFormHint", "Add delivery location details and confirm order creation.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label>{t("purchase.paymentMethod", "Payment method")}</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={orderForm.payment_method === "escrow" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOrderForm((p) => ({ ...p, payment_method: "escrow" }))}
                >
                  {t("purchase.escrow", "Escrow")}
                </Button>
                <Button
                  type="button"
                  variant={orderForm.payment_method === "cod" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOrderForm((p) => ({ ...p, payment_method: "cod" }))}
                >
                  {t("purchase.cod", "Cash on Delivery")}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("purchase.buyerName", "الاسم")}</Label>
              <Input
                value={orderForm.buyer_name}
                onChange={(e) => setOrderForm((p) => ({ ...p, buyer_name: e.target.value }))}
                placeholder={t("auth.namePlaceholder")}
                aria-invalid={Boolean(orderFormErrors.buyer_name)}
              />
              {orderFormErrors.buyer_name ? <p className="text-xs text-destructive">{orderFormErrors.buyer_name}</p> : null}
            </div>
            <div className="space-y-1">
              <Label>{t("purchase.buyerPhone", "رقم الجوال")}</Label>
              <Input
                {...SAUDI_PHONE_INPUT_PROPS}
                value={orderForm.buyer_phone}
                onChange={(e) => setOrderForm((p) => ({ ...p, buyer_phone: e.target.value }))}
                aria-invalid={Boolean(orderFormErrors.buyer_phone)}
              />
              {orderFormErrors.buyer_phone ? <p className="text-xs text-destructive">{orderFormErrors.buyer_phone}</p> : null}
            </div>
            <div className="space-y-1">
              <Label>{t("purchase.shippingAddress", "Shipping address")}</Label>
              <Input
                value={orderForm.shipping_address}
                onChange={(e) => setOrderForm((p) => ({ ...p, shipping_address: e.target.value }))}
                placeholder={t("purchase.addressPlaceholder")}
                aria-invalid={Boolean(orderFormErrors.shipping_address)}
              />
              {orderFormErrors.shipping_address ? <p className="text-xs text-destructive">{orderFormErrors.shipping_address}</p> : null}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("purchase.mapSelectLabel", "موقع المعاينة على الخريطة")}</Label>
              <Suspense
                fallback={
                  <Skeleton className="flex h-[220px] w-full items-center justify-center rounded-md border border-border text-xs text-muted-foreground">
                    {t("common.loading", "جار التحميل...")}
                  </Skeleton>
                }
              >
                <StandardLocationMapField
                  key={`order-bid-map-${createOrderBid?.id ?? "new"}`}
                  language={i18n.language}
                  lat={orderForm.shipping_lat === "" ? null : Number(orderForm.shipping_lat)}
                  lng={orderForm.shipping_lng === "" ? null : Number(orderForm.shipping_lng)}
                  address={orderForm.shipping_address}
                  searchPlaceholder={t("purchase.addressPlaceholder")}
                  onAddressResolved={(addr) => {
                    if (addr) setOrderForm((p) => ({ ...p, shipping_address: addr }))
                  }}
                  onChange={({ lat, lng }) => {
                    setOrderForm((p) => ({ ...p, shipping_lat: String(lat), shipping_lng: String(lng) }))
                  }}
                  onPlaceResolved={(addr, lat, lng) => {
                    setOrderForm((p) => ({
                      ...p,
                      shipping_address: addr || p.shipping_address,
                      shipping_lat: lat != null ? String(lat) : p.shipping_lat,
                      shipping_lng: lng != null ? String(lng) : p.shipping_lng,
                    }))
                  }}
                />
              </Suspense>
            </div>
            <div className="space-y-1">
              <Label>{t("purchase.buyerNote", "ملاحظات الطلب (اختياري)")}</Label>
              <Input
                value={orderForm.buyer_note}
                onChange={(e) => setOrderForm((p) => ({ ...p, buyer_note: e.target.value }))}
                placeholder={t("purchase.buyerNotePlaceholder", "تعليمات التوصيل، الوقت المناسب، إلخ.")}
                aria-invalid={Boolean(orderFormErrors.buyer_note)}
              />
              {orderFormErrors.buyer_note ? <p className="text-xs text-destructive">{orderFormErrors.buyer_note}</p> : null}
            </div>
            {orderForm.payment_method === "escrow" ? (
              <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{t("purchase.availableBalance", "رصيدك المتاح")}</span>
                  <span className="font-semibold tabular-nums">
                    {Math.round(availableBalance).toLocaleString()} {t("common.currency")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{t("purchase.requiredForOrder", "المطلوب لهذا الطلب")}</span>
                  <span className="font-semibold tabular-nums">
                    {Math.round(createOrderAmount).toLocaleString()} {t("common.currency")}
                  </span>
                </div>
                {escrowBlocked ? (
                  <p className="text-destructive">
                    {t("purchase.insufficientBalance", "الرصيد غير كافٍ. شحن الرصيد من المحفظة ثم أعد المحاولة.")}{" "}
                    <Link to="/dashboard/wallet" className="underline underline-offset-2">
                      {t("purchase.openWallet", "فتح المحفظة")}
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <Button
              disabled={createOrderMutation.isPending || orderFormInvalid || escrowBlocked}
              onClick={() => {
                if (!createOrderBid?.id) return
                if (orderFormInvalid) {
                  toast.error(t("purchase.validation.fixForm", "صحّح الحقول المظللة ثم أعد المحاولة."))
                  return
                }
                if (orderForm.shipping_lat === "" || orderForm.shipping_lng === "") {
                  toast.error(t("purchase.mapPinRequired", "حدّد موقع المعاينة على الخريطة"))
                  return
                }
                createOrderMutation.mutate({
                  bidId: createOrderBid.id,
                  payload: {
                    payment_method: orderForm.payment_method,
                    buyer_name: orderForm.buyer_name?.trim() || user?.name || null,
                    buyer_phone: normalizeSaudiPhone(orderForm.buyer_phone) || user?.phone || null,
                    shipping_address: orderForm.shipping_address?.trim() || null,
                    shipping_lat: orderForm.shipping_lat !== "" ? Number(orderForm.shipping_lat) : null,
                    shipping_lng: orderForm.shipping_lng !== "" ? Number(orderForm.shipping_lng) : null,
                    buyer_note: orderForm.buyer_note?.trim() || null,
                  },
                })
              }}
            >
              {createOrderMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("bids.completeOrder")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
