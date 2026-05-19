import { useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  fetchServiceProviderDashboard,
  saveServiceProvider,
  updateServiceRequestStatus,
} from "@/services/servicesMarketService"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { getDirection } from "@/lib/direction"

const statusOptions = ["new", "in_progress", "en_route", "completed", "cancelled"]

export function CompanyServicesPage() {
  const { t, i18n } = useTranslation()
  const dir = getDirection(i18n.language)
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    title: "",
    description: "",
    service_type: "general",
    price_from: "",
    cities: "",
    is_available: true,
  })

  const dashboardQuery = useQuery({
    queryKey: ["services", "provider-dashboard"],
    queryFn: fetchServiceProviderDashboard,
  })

  const provider = dashboardQuery.data?.provider
  const requests = dashboardQuery.data?.requests ?? []

  const saveMutation = useMutation({
    mutationFn: () =>
      saveServiceProvider({
        title: form.title.trim(),
        description: form.description.trim(),
        service_type: form.service_type,
        price_from: form.price_from ? Number(form.price_from) : null,
        cities: form.cities
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        is_available: form.is_available,
      }),
    onSuccess: () => {
      toast.success(t("services.dashboard.saved"))
      queryClient.invalidateQueries({ queryKey: ["services", "provider-dashboard"] })
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("services.dashboard.saveError")),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateServiceRequestStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services", "provider-dashboard"] }),
  })

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("services.dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("services.dashboard.subtitle")}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/?cat=services">{t("services.provider.backToMarket")}</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("services.dashboard.profileForm")}</CardTitle>
            <CardDescription>{t("services.dashboard.profileFormDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("services.dashboard.titleLabel")}</Label>
              <Input
                value={form.title || provider?.title || ""}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("services.dashboard.descriptionLabel")}</Label>
              <Textarea
                value={form.description || provider?.description || ""}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("services.dashboard.citiesLabel")}</Label>
              <Input
                placeholder={t("services.dashboard.citiesPlaceholder")}
                value={form.cities}
                onChange={(e) => setForm((p) => ({ ...p, cities: e.target.value }))}
              />
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {t("services.dashboard.saveProfile")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("services.dashboard.requestsTitle")}</CardTitle>
            <CardDescription>
              {t("services.dashboard.requestsStats", {
                open: dashboardQuery.data?.stats?.open_requests ?? 0,
                completed: dashboardQuery.data?.stats?.completed ?? 0,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("services.dashboard.noRequests")}</p>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="rounded-xl border border-border/60 p-3 text-start">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{req.user?.name ?? t("services.dashboard.anonymous")}</p>
                    <Badge variant="secondary">{req.status}</Badge>
                  </div>
                  {req.message ? <p className="mt-2 text-sm text-muted-foreground">{req.message}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {statusOptions.map((status) => (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={req.status === status ? "default" : "outline"}
                        onClick={() => statusMutation.mutate({ id: req.id, status })}
                      >
                        {t(`services.status.${status}`)}
                      </Button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
