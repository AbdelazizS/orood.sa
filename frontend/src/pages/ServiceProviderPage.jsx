import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { fetchServiceProvider, createServiceRequest } from "@/services/servicesMarketService"
import { WholesalePageShell } from "@/components/wholesale/WholesalePageShell"
import { LocationMapPicker } from "@/components/maps/LocationMapPicker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { resolveImageUrl } from "@/lib/imageUrl"
import { getDirection } from "@/lib/direction"
import { useAuthStore } from "@/store/useAuthStore"
import { useNavigate } from "react-router-dom"
import { Star } from "lucide-react"

export function ServiceProviderPage() {
  const { t, i18n } = useTranslation()
  const dir = getDirection(i18n.language)
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [message, setMessage] = useState("")
  const [mapValue, setMapValue] = useState(null)

  const query = useQuery({
    queryKey: ["services", "provider", id],
    queryFn: () => fetchServiceProvider(id),
    enabled: Boolean(id),
  })

  const provider = query.data
  const avatar = provider?.user?.avatar ? resolveImageUrl(provider.user.avatar) : undefined

  const requestMutation = useMutation({
    mutationFn: () =>
      createServiceRequest({
        service_provider_id: provider.id,
        message: message.trim() || null,
        address_text: mapValue?.address ?? null,
      }),
    onSuccess: () => {
      toast.success(t("services.provider.requestSent"))
      setMessage("")
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("services.provider.requestError")),
  })

  const onRequest = () => {
    if (!user) {
      toast.error(t("wholesale.market.loginRequired"))
      navigate("/login")
      return
    }
    requestMutation.mutate()
  }

  if (query.isLoading) {
    return (
      <section className="min-h-[300px] bg-background py-8" dir={dir}>
        <WholesalePageShell>
          <Card className="h-64 animate-pulse rounded-2xl bg-muted/40" />
        </WholesalePageShell>
      </section>
    )
  }

  if (!provider) {
    return (
      <section className="min-h-[300px] bg-background py-8" dir={dir}>
        <WholesalePageShell>
          <p className="text-sm text-muted-foreground">{t("services.provider.notFound")}</p>
        </WholesalePageShell>
      </section>
    )
  }

  return (
    <section className="min-h-[400px] bg-background pb-10 pt-4" dir={dir}>
      <WholesalePageShell className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link to="/services">{t("services.provider.backToMarket")}</Link>
        </Button>

        <Card className="overflow-hidden rounded-3xl border-border/60">
          <CardHeader className="flex flex-row items-start gap-4 space-y-0">
            <Avatar className="size-16 border-2 border-border">
              <AvatarImage src={avatar} alt="" />
              <AvatarFallback>{provider.title?.[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-start">
              <CardTitle className="text-2xl">{provider.title}</CardTitle>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {Number(provider.rating_avg || 0).toFixed(1)} · {provider.category?.name}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-start">
            <p className="text-muted-foreground">{provider.description}</p>
            <div className="flex flex-wrap gap-2">
              {provider.user?.id ? (
                <Button variant="outline" className="rounded-xl" asChild>
                  <Link to={`/profile/${provider.user.id}`}>{t("listingDetail.messageMe")}</Link>
                </Button>
              ) : null}
              <Button className="rounded-xl" onClick={onRequest} disabled={requestMutation.isPending}>
                {t("services.provider.requestService")}
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("services.provider.requestNote")}</p>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} dir={dir} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("services.provider.coverageMap")}</p>
              <LocationMapPicker value={mapValue} onChange={setMapValue} className="min-h-[220px] rounded-xl" />
            </div>
          </CardContent>
        </Card>
      </WholesalePageShell>
    </section>
  )
}
