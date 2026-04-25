import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Loader2, Gavel, Eye, EyeOff, Trash2, MessageSquare, Check, X } from "lucide-react"
import { toast } from "sonner"

function formatSarAmount(val) {
  if (val == null || val === "") return "—"
  const n = Number(val)
  if (Number.isNaN(n)) return "—"
  return `${Math.round(n).toLocaleString()}`
}

export function BidSection({ product }) {
  const { t } = useTranslation()
  const { user, token } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState("")
  const [message, setMessage] = useState("")
  const [amountError, setAmountError] = useState("")
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [rejectBid, setRejectBid] = useState(null)

  const { data: bidsData, isLoading } = useQuery({
    queryKey: ["bids", product.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/products/${product.id}/bids`)
      return {
        bids: data?.data ?? [],
        highestBid: data?.highest_bid ?? null,
        minimumNextBid: data?.minimum_next_bid ?? null,
      }
    },
    enabled: Boolean(product?.id),
  })

  const bidsRaw = bidsData?.bids ?? []
  const getDisplayName = (person) => {
    const username = person?.username?.trim()
    if (username) return username
    const name = person?.name?.trim()
    if (name) return name
    return t("comments.guest", "Guest")
  }

  const bids = [...bidsRaw].sort((a, b) => {
    const amtA = a.amount ?? -Infinity
    const amtB = b.amount ?? -Infinity
    return amtA - amtB
  })
  const highestBid = bids.filter((b) => b.amount != null).reduce(
    (best, b) => (!best || b.amount > best.amount ? b : best),
    null
  )

  const myBid = user?.id ? bids.find((b) => Number(b.user?.id) === Number(user.id)) : null
  const minNext = bidsData?.minimum_next_bid ?? product?.minimum_next_bid ?? null

  const placeBidMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/products/${product.id}/bids`, {
        amount: parseFloat(amount),
        message: message || undefined,
      }),
    onSuccess: async () => {
      setAmountError("")
      await queryClient.invalidateQueries({ queryKey: ["bids", product.id] })
      await queryClient.invalidateQueries({ queryKey: ["product", String(product.id)] })
      await queryClient.invalidateQueries({ queryKey: ["listing-comments", product.id] })
      setAmount("")
      setMessage("")
      toast.success(t("bids.success", "Bid placed successfully"))
    },
    onError: (error) => {
      const knownCode = error?.response?.data?.code
      const serverMessage = error?.response?.data?.errors?.amount?.[0] ?? error?.response?.data?.message
      if (knownCode === "BID_AMOUNT_REQUIRED") {
        setAmountError(t("bids.amountRequired", "Enter a valid bid amount"))
        return
      }
      if (error?.response?.status === 422 && serverMessage) {
        setAmountError(serverMessage)
        return
      }
      setAmountError("")
      toast.error(serverMessage ?? t("common.errorGeneric", "Something went wrong"))
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: () => apiClient.delete(`/products/${product.id}/bids/${myBid.id}`),
    onSuccess: async () => {
      setWithdrawOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["bids", product.id] })
      await queryClient.invalidateQueries({ queryKey: ["product", String(product.id)] })
      await queryClient.invalidateQueries({ queryKey: ["listing-comments", product.id] })
      toast.success(t("bids.withdrawn", "تم سحب عرضك"))
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("common.errorGeneric"))
    },
  })

  const visibilityMutation = useMutation({
    mutationFn: () => apiClient.patch(`/products/${product.id}/bids/${myBid.id}/visibility`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bids", product.id] })
      await queryClient.invalidateQueries({ queryKey: ["product", String(product.id)] })
      toast.success(t("bids.visibilityUpdated", "تم تحديث ظهور عرضك"))
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("common.errorGeneric"))
    },
  })

  const acceptBidMutation = useMutation({
    mutationFn: (bidId) => apiClient.post(`/products/${product.id}/bids/${bidId}/accept`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["account", "bids"] })
      await queryClient.invalidateQueries({ queryKey: ["bids", product.id] })
      await queryClient.invalidateQueries({ queryKey: ["product", String(product.id)] })
      await queryClient.invalidateQueries({ queryKey: ["listing-comments", product.id] })
      toast.success(t("bids.acceptSuccess"))
    },
    onError: (error) => {
      const msg = error?.response?.data?.message
      const lower = typeof msg === "string" ? msg.toLowerCase() : ""
      if (lower.includes("insufficient") || lower.includes("balance") || lower.includes("رصيد")) {
        toast.error(t("bids.acceptInsufficientBalance"))
        return
      }
      toast.error(msg ?? t("common.errorGeneric"))
    },
  })

  const rejectBidMutation = useMutation({
    mutationFn: (bidId) => apiClient.post(`/products/${product.id}/bids/${bidId}/reject`),
    onSuccess: async () => {
      setRejectBid(null)
      await queryClient.invalidateQueries({ queryKey: ["account", "bids"] })
      await queryClient.invalidateQueries({ queryKey: ["bids", product.id] })
      await queryClient.invalidateQueries({ queryKey: ["product", String(product.id)] })
      await queryClient.invalidateQueries({ queryKey: ["listing-comments", product.id] })
      toast.success(t("bids.rejectSuccess"))
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("common.errorGeneric"))
    },
  })

  const openMessageSeller = () => navigate(`/dashboard/messages?product=${product.id}`)
  const openMessageBuyer = (recipientId) => navigate(`/dashboard/messages?with=${recipientId}`)

  if (!product?.accept_bids) return null

  const isOwner = user?.id === product?.seller?.id || user?.id === product?.user_id
  const bidsVisible = product?.bids_visible ?? true
  const canBid = !isOwner

  return (
    <Card id="bids-section" className="mx-4 mt-4 scroll-mt-24 sm:mx-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gavel className="size-4" />
          {t("bids.title", "السوم")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {myBid && canBid ? (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-foreground">{t("bids.yourBid", "عرضك")}</span>
              <span className="font-semibold text-primary">
                {myBid.amount_hidden
                  ? t("bids.hidden", "مخفي")
                  : `${formatSarAmount(myBid.amount)} ${t("common.currency", "ريال")}`}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {bidsVisible ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={visibilityMutation.isPending}
                  onClick={() => visibilityMutation.mutate()}
                >
                  {myBid.is_visible === false ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  {myBid.is_visible === false ? t("bids.showBid", "إظهار") : t("bids.hideBid", "إخفاء")}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={!token}
                onClick={() => {
                  if (!token) {
                    navigate("/login", { state: { redirectTo: location.pathname } })
                    return
                  }
                  openMessageSeller()
                }}
              >
                <MessageSquare className="size-3.5" />
                {t("bids.messageSeller", "مراسلة البائع")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="gap-1"
                onClick={() => setWithdrawOpen(true)}
              >
                <Trash2 className="size-3.5" />
                {t("bids.withdraw", "سحب العرض")}
              </Button>
            </div>
          </div>
        ) : null}

        {canBid && !myBid && token ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={openMessageSeller}
          >
            <MessageSquare className="size-3.5" />
            {t("bids.messageSeller", "مراسلة البائع")}
          </Button>
        ) : null}

        {bidsVisible && bidsData?.highestBid != null && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
            {t("bids.highestBid", "Highest bid")}: {formatSarAmount(bidsData.highestBid)} {t("common.currency", "SAR")}
          </div>
        )}

        {!bidsVisible && !isOwner && minNext != null ? (
          <p className="text-sm text-muted-foreground">
            {t("bids.privateHintAmount", "المزاد مخفي عن العامة. أقل مبلغ تقبله المنصة للمزايدة التالية: {{amount}} {{currency}}", {
              amount: formatSarAmount(minNext),
              currency: t("common.currency", "ريال"),
            })}
          </p>
        ) : null}

        {!bidsVisible && !isOwner && minNext == null ? (
          <p className="text-sm text-muted-foreground">
            {t("bids.privateHint", "Private bidding: you cannot see other bids")}
          </p>
        ) : null}

        {bidsVisible && bids.length > 0 && (
          <div className="space-y-2">
            {bids.map((bid) => {
              const isHighest = highestBid && bid.id === highestBid.id
              const buyerId = bid.user?.id
              return (
                <div
                  key={bid.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
                    isHighest && "border-primary bg-primary/5"
                  )}
                >
                  <span className="font-medium">{getDisplayName(bid.user)}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={isHighest ? "font-semibold text-primary" : "text-muted-foreground"}>
                      {bid.amount_hidden
                        ? t("bids.hidden", "مخفي")
                        : `${formatSarAmount(bid.amount)} ${t("common.currency", "ريال")}`}
                    </span>
                    {isOwner && buyerId && Number(buyerId) !== Number(user?.id) ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 px-2 text-xs"
                          onClick={() => openMessageBuyer(Number(buyerId))}
                        >
                          <MessageSquare className="size-3.5" />
                          {t("bids.messageBuyer", "مراسلة المشتري")}
                        </Button>
                        {bid.status === "PENDING" || bid.status == null ? (
                          <>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              className="h-8 gap-1 px-2 text-xs"
                              disabled={acceptBidMutation.isPending || rejectBidMutation.isPending}
                              onClick={() => acceptBidMutation.mutate(bid.id)}
                            >
                              {acceptBidMutation.isPending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Check className="size-3.5" />
                              )}
                              {t("bids.acceptBid")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 px-2 text-xs"
                              disabled={acceptBidMutation.isPending || rejectBidMutation.isPending}
                              onClick={() => setRejectBid(bid)}
                            >
                              <X className="size-3.5" />
                              {t("bids.rejectBid")}
                            </Button>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {canBid && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setAmountError("")
              if (!token) {
                navigate("/login", { state: { redirectTo: location.pathname } })
                return
              }
              if (!amount) {
                setAmountError(t("bids.amountRequired", "Enter a valid bid amount"))
                return
              }
              placeBidMutation.mutate()
            }}
            className="space-y-2"
          >
            {minNext != null ? (
              <p className="text-xs text-muted-foreground">
                {t("bids.minNextHint", "يجب أن يكون مبلغك أعلى من {{amount}} {{currency}}", {
                  amount: formatSarAmount(minNext),
                  currency: t("common.currency", "ريال"),
                })}
              </p>
            ) : null}
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={t("bids.amountPlaceholder")}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                if (amountError) setAmountError("")
              }}
              disabled={placeBidMutation.isPending}
              className={amountError ? "border-destructive" : ""}
              aria-invalid={Boolean(amountError)}
            />
            {amountError ? <p className="text-xs text-destructive">{amountError}</p> : null}
            <Input
              placeholder={t("bids.messagePlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={placeBidMutation.isPending}
            />
            <Button type="submit" size="sm" disabled={!amount || placeBidMutation.isPending}>
              {placeBidMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("bids.place")}
            </Button>
          </form>
        )}
        {isLoading && (
          <div className="text-sm text-muted-foreground">{t("common.loading", "جار التحميل...")}</div>
        )}
      </CardContent>

      <AlertDialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bids.withdrawConfirmTitle", "سحب العرض؟")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("bids.withdrawConfirmBody", "لن يُعتد بهذا العرض بعد السحب. يمكنك تقديم عرض جديد لاحقًا.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "إلغاء")}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={withdrawMutation.isPending}
              onClick={() => withdrawMutation.mutate()}
            >
              {withdrawMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("bids.withdraw", "سحب العرض")}
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
            <AlertDialogCancel>{t("common.cancel", "إلغاء")}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={rejectBidMutation.isPending}
              onClick={() => {
                if (!rejectBid?.id) return
                rejectBidMutation.mutate(rejectBid.id)
              }}
            >
              {rejectBidMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("bids.rejectBid")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
