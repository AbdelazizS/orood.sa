import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Loader2, Clock } from "lucide-react"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function GroupBuySection({ listingId, product }) {
  const { t } = useTranslation()
  const { token, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [qty, setQty] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["group-buy", listingId],
    queryFn: async () => {
      const { data: res } = await apiClient.get(`/listings/${listingId}/group-buy/progress`)
      return res?.data
    },
    enabled: Boolean(listingId) && Boolean(product?.is_wholesale) && Boolean(product?.min_quantity),
  })

  const mutation = useMutation({
    mutationFn: async (body) => {
      const { data: res } = await apiClient.post(`/listings/${listingId}/group-buy/reserve`, body)
      return res
    },
    onSuccess: (res) => {
      toast.success(res?.message ?? t("groupBuy.saved"))
      queryClient.invalidateQueries({ queryKey: ["group-buy", listingId] })
    },
    onError: (err) => {
      const msg = err?.response?.data?.message ?? t("common.errorGeneric")
      toast.error(msg)
    },
  })

  if (!product?.is_wholesale || !product?.min_quantity) return null
  if (user?.id && product?.seller?.id && user.id === product.seller.id) return null
  if (isLoading || !data?.enabled) return null

  const target = data.target
  const reserved = data.reserved
  const remaining = data.remaining
  const filled = data.filled
  const awaitingPayment = data.awaiting_payment
  const mine = data.mine

  const handleReserve = (e) => {
    e.preventDefault()
    if (!token) {
      toast.info(t("groupBuy.loginToReserve"))
      return
    }
    mutation.mutate({ quantity: Math.max(1, Number(qty) || 1) })
  }

  return (
    <div className="border-b border-border px-4 py-4 sm:px-6">
      <h3 className="text-base font-bold flex items-center gap-2">
        <Clock className="size-5 text-muted-foreground" />
        {t("groupBuy.title")}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("groupBuy.targetLabel", { count: target })}
      </p>
      <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p>
          {t("groupBuy.reserved")}: <strong>{reserved}</strong> â€” {t("groupBuy.remaining")}:{" "}
          <strong>{remaining}</strong>
        </p>
        {mine ? (
          <p className="mt-2 text-primary">
            {t("groupBuy.yours")}: {mine.quantity} ({mine.status})
          </p>
        ) : null}
        {filled || awaitingPayment ? (
          <p className="mt-2 font-medium text-primary">{t("groupBuy.filledAwaiting")}</p>
        ) : null}
      </div>
      {!filled && !awaitingPayment && (
        <form onSubmit={handleReserve} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="gb-qty">{t("groupBuy.quantity")}</Label>
            <Input
              id="gb-qty"
              type="number"
              min={1}
              max={remaining || 9999}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-28"
            />
          </div>
          {token ? (
            <Button type="submit" disabled={mutation.isPending || remaining <= 0}>
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("groupBuy.reserve")}
            </Button>
          ) : (
            <Button type="button" asChild>
              <Link to="/login" state={{ from: `/products/${listingId}` }}>
                {t("common.login")}
              </Link>
            </Button>
          )}
        </form>
      )}
    </div>
  )
}
