import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Loader2, Gavel } from "lucide-react"

export function BidSection({ product }) {
  const { t } = useTranslation()
  const { user, token } = useAuthStore()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState("")
  const [message, setMessage] = useState("")

  const { data: bidsRaw = [], isLoading } = useQuery({
    queryKey: ["bids", product.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/products/${product.id}/bids`)
      return data?.data ?? []
    },
    enabled: Boolean(product?.id),
  })

  // Sort bids low → high (visible amounts first)
  const bids = [...bidsRaw].sort((a, b) => {
    const amtA = a.amount ?? -Infinity
    const amtB = b.amount ?? -Infinity
    return amtA - amtB
  })
  const highestBid = bids.filter((b) => b.amount != null).reduce(
    (best, b) => (!best || b.amount > best.amount ? b : best),
    null
  )

  const placeBidMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/products/${product.id}/bids`, {
        amount: parseFloat(amount),
        message: message || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bids", product.id] })
      queryClient.invalidateQueries({ queryKey: ["product", product.id] })
      setAmount("")
      setMessage("")
    },
  })

  if (!product?.accept_bids) return null

  const isOwner = user?.id === product?.seller?.id
  const canBid = token && !isOwner

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gavel className="size-4" />
          {t("bids.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bids.length > 0 && (
          <div className="space-y-2">
            {bids.map((bid) => {
              const isHighest = highestBid && bid.id === highestBid.id
              return (
                <div
                  key={bid.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                    isHighest && "border-primary bg-primary/5"
                  )}
                >
                  <span className="font-medium">{bid.user?.name ?? "***"}</span>
                  <span className={isHighest ? "font-semibold text-primary" : "text-muted-foreground"}>
                    {bid.amount_hidden ? t("bids.hidden", "Hidden") : `${bid.amount} SAR`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        {canBid && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (amount) placeBidMutation.mutate()
            }}
            className="space-y-2"
          >
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={t("bids.amountPlaceholder")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={placeBidMutation.isPending}
            />
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
      </CardContent>
    </Card>
  )
}
