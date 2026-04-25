import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useAuthStore } from "@/store/useAuthStore"
import {
  cancelWholesaleReservation,
  fetchWholesaleProductDetails,
  reserveWholesaleProduct,
} from "@/services/wholesaleService"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getDirection, isRtlLanguage } from "@/lib/direction"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function WholesaleProductPage() {
  const { t, i18n } = useTranslation()
  const dir = getDirection(i18n.language)
  const isRTL = isRtlLanguage(i18n.language)
  const CrumbIcon = isRTL ? ChevronLeft : ChevronRight
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams()
  const [reserveQty, setReserveQty] = useState(1)

  const query = useQuery({
    queryKey: ["wholesale", "product", id],
    queryFn: () => fetchWholesaleProductDetails(id),
    enabled: Boolean(id),
  })
  const product = query.data?.data

  const reserveMutation = useMutation({
    mutationFn: ({ productId, quantity }) => reserveWholesaleProduct(productId, quantity),
    onSuccess: () => {
      toast.success(t("wholesale.market.reserveSuccess"))
      queryClient.invalidateQueries({ queryKey: ["wholesale", "product", id] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("wholesale.market.reserveError"))
    },
  })
  const cancelMutation = useMutation({
    mutationFn: (productId) => cancelWholesaleReservation(productId),
    onSuccess: () => {
      toast.success(t("wholesale.market.cancelSuccess"))
      queryClient.invalidateQueries({ queryKey: ["wholesale", "product", id] })
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? t("wholesale.market.cancelError"))
    },
  })

  const onReserve = () => {
    if (!user) {
      toast.error(t("wholesale.market.loginRequired"))
      navigate("/login")
      return
    }
    reserveMutation.mutate({ productId: product.id, quantity: reserveQty })
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:py-8" dir={dir}>
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">{t("nav.home")}</Link>
        <CrumbIcon className="size-4" />
        <Link to="/wholesale" className="hover:text-foreground">{t("wholesale.market.title")}</Link>
        <CrumbIcon className="size-4" />
        <span className="font-medium text-foreground">{product?.title ?? t("wholesale.product.title")}</span>
      </div>

      {product ? (
        <Card>
          <CardContent className="grid gap-6 p-5 md:grid-cols-2">
            <div className="space-y-3">
              <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                {product?.media?.image_url ? (
                  <img src={product.media.image_url} alt={product.title} className="size-full object-cover" />
                ) : null}
              </div>
            </div>

            <div className={cn("space-y-4", isRTL ? "text-end" : "text-start")}>
              <div>
                <h1 className="text-2xl font-bold">{product.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {product?.seller?.company?.name ?? product?.seller?.name ?? t("common.member")}
                </p>
              </div>

              <div className="rounded-xl bg-muted/40 p-4">
                <div className={cn("flex items-center gap-2", isRTL ? "justify-end" : "justify-start")}>
                  <span className="text-sm text-muted-foreground line-through">{product.price}</span>
                  <Badge variant="destructive">
                    {t("wholesale.market.discountBadge", { percent: product?.discount_percent ?? 0 })}
                  </Badge>
                </div>
                <p className="mt-1 text-2xl font-bold text-primary">{product.wholesale_price}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{t("wholesale.market.currentBuyers", { count: product?.current_buyers ?? 0 })}</span>
                  <span>{t("wholesale.market.remainingBuyers", { count: product?.remaining_needed ?? 0 })}</span>
                </div>
                <Progress value={product?.progress_percentage ?? 0} className="h-2" />
              </div>

              <p className="text-sm leading-7 text-muted-foreground">{product.description}</p>

              <div className="space-y-3">
                {(product?.participants ?? []).length ? (
                  <div className={cn("flex flex-wrap gap-2", isRTL ? "justify-end" : "justify-start")}>
                    {product.participants.map((row) => (
                      <Badge key={row.id} variant="outline">
                        {row.user?.name ?? t("common.member")} × {row.quantity}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {product?.my_reservation?.status === "payment_pending" ? (
                  <Button className="w-full" asChild>
                    <Link to={`/wholesale/checkout/${product.my_reservation.id}`}>
                      {t("wholesale.market.goToCheckout")}
                    </Link>
                  </Button>
                ) : product?.user_reserved && product?.my_reservation?.status === "pending" ? (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => cancelMutation.mutate(product.id)}
                    disabled={cancelMutation.isPending}
                  >
                    {t("wholesale.market.cancelReserve")}
                  </Button>
                ) : !product?.campaign_completed ? (
                  <div className={cn("flex gap-2", isRTL ? "" : "flex-row-reverse")}>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, Number(product?.remaining_needed ?? 1))}
                      value={reserveQty}
                      onChange={(e) => setReserveQty(Number(e.target.value || 1))}
                      className="h-10 w-24 rounded-md border border-input bg-background px-2 text-center text-sm"
                    />
                    <Button className="flex-1" onClick={onReserve} disabled={reserveMutation.isPending}>
                      {t("wholesale.market.reserve")}
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" variant="secondary" disabled>
                    {t("wholesale.market.completedAwaitCheckout")}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t("wholesale.product.notFound")}
          </CardContent>
        </Card>
      )}
    </section>
  )
}
