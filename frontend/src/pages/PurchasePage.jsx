import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import apiClient from "@/lib/apiClient"
import { useAuthStore } from "@/store/useAuthStore"
import { ShoppingCart, Loader2, Wallet, Package, Shield } from "lucide-react"
import { resolveImageUrl } from "@/lib/imageUrl"

const formatPrice = (price, t) => {
  if (price == null) return null
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(price)
}

export function PurchasePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { user, token } = useAuthStore()

  const [paymentMethod, setPaymentMethod] = useState("escrow")
  const [shippingAddress, setShippingAddress] = useState("")
  const [buyerPhone, setBuyerPhone] = useState(user?.phone ?? "")
  const [buyerName, setBuyerName] = useState(user?.name ?? "")

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/products/${id}`)
      return data?.data
    },
    enabled: Boolean(id),
  })

  const purchaseMutation = useMutation({
    mutationFn: (payload) => apiClient.post(`/products/${id}/purchase`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] })
      navigate("/dashboard/orders")
    },
  })

  if (!token) {
    navigate("/login", { replace: true })
    return null
  }

  if (isLoading || !product) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <Skeleton className="h-64" />
      </div>
    )
  }

  const hasPrice = product?.price != null && product?.price > 0
  const isOffer = product?.type === "offer"
  const isOwner = user?.id === product?.seller?.id

  if (!hasPrice || !isOffer || isOwner) {
    navigate(`/products/${id}`, { replace: true })
    return null
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    purchaseMutation.mutate({
      payment_method: paymentMethod,
      shipping_address: shippingAddress || null,
      buyer_phone: buyerPhone || user?.phone,
      buyer_email: user?.email,
      buyer_name: buyerName || user?.name,
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ShoppingCart className="size-7" />
        {t("purchase.title", "اشتر الآن")}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice / Order details */}
        <Card>
          <CardHeader>
            <CardTitle>{t("purchase.invoice", "الفاتورة وتفاصيل الطلب")}</CardTitle>
            <CardDescription>{t("purchase.invoiceDescription", "تفاصيل المنتج والطلب")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 rounded-lg border p-4">
              {product?.media?.image_url && (
                <img
                  src={resolveImageUrl(product.media.image_url)}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{product?.title}</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {formatPrice(product?.price, t)}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("purchase.buyerName", "الاسم")}</Label>
              <Input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder={t("auth.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("purchase.buyerPhone", "رقم الجوال")}</Label>
              <Input
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="05xxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("purchase.shippingAddress", "عنوان الشحن")} ({t("common.optional")})</Label>
              <Input
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder={t("purchase.addressPlaceholder", "المدينة، الحي، الشارع")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment method */}
        <Card>
          <CardHeader>
            <CardTitle>{t("purchase.paymentMethod", "طريقة الدفع")}</CardTitle>
            <CardDescription>{t("purchase.paymentMethodDescription", "اختر طريقة الدفع")}</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
              <div className="flex items-start space-x-3 space-x-reverse rounded-lg border p-4 has-[[data-state=checked]]:border-primary">
                <RadioGroupItem value="escrow" id="escrow" />
                <Label htmlFor="escrow" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <Wallet className="size-5" />
                    {t("purchase.escrow", "الدفع عبر المنصة")}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("purchase.escrowDescription", "يتم شحن الرصيد واحتفاظ المبلغ حتى استلام المنتج")}
                  </p>
                </Label>
              </div>
              <div className="flex items-start space-x-3 space-x-reverse rounded-lg border p-4 has-[[data-state=checked]]:border-primary">
                <RadioGroupItem value="cod" id="cod" />
                <Label htmlFor="cod" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <Package className="size-5" />
                    {t("purchase.cod", "الدفع عند الاستلام")}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("purchase.codDescription", "ادفع عند وصول المنتج — مثل أمازون أو مستقل")}
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Trust badge */}
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-4 text-sm">
          <Shield className="size-5 shrink-0 text-primary" />
          <span>{t("purchase.trustMessage", "كن مطمئن — مدفوعات آمنة، استرداد في حال عدم الاستلام")}</span>
        </div>

        {purchaseMutation.isError && (
          <p className="text-sm text-destructive">
            {purchaseMutation.error?.response?.data?.message ?? t("common.error")}
          </p>
        )}

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/products/${id}`)}
            disabled={purchaseMutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={purchaseMutation.isPending}
          >
            {purchaseMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShoppingCart className="size-4" />
            )}
            {t("purchase.confirm", "تأكيد الشراء")}
          </Button>
        </div>
      </form>
    </div>
  )
}
