import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import apiClient from "@/lib/apiClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

const STATUSES = ["pending", "approved", "rejected"]

export function AdminCompaniesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState("pending")
  const [rejectingId, setRejectingId] = useState(null)
  const [reason, setReason] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "companies", status],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/admin/companies", { params: { status } })
      return res
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/admin/companies/${id}/approve`),
    onSuccess: () => {
      toast.success(t("admin.companyApproved"))
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reasonText }) => apiClient.post(`/admin/companies/${id}/reject`, { reason: reasonText }),
    onSuccess: () => {
      setRejectingId(null)
      setReason("")
      toast.success(t("admin.companyRejected"))
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] })
    },
  })

  const rows = useMemo(() => data?.data ?? [], [data])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.companiesVerificationTitle")}</h1>
        <p className="text-muted-foreground text-sm">{t("admin.companiesVerificationDesc")}</p>
      </div>

      <Tabs value={status} onValueChange={setStatus}>
        <TabsList>
          {STATUSES.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t(`admin.companyStatus.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-4">
          {rows.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                {t("admin.noCompaniesForStatus")}
              </CardContent>
            </Card>
          ) : (
            rows.map((company) => (
              <Card key={company.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span>{company.name}</span>
                    <Badge variant={status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary"}>
                      {t(`admin.companyStatus.${company.verification_status}`)}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {company.user?.name} - {company.user?.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {company.license_url ? (
                    <a className="text-primary hover:underline" href={company.license_url} target="_blank" rel="noreferrer">
                      {t("admin.viewCompanyLicense")}
                    </a>
                  ) : null}
                  {company.rejection_reason ? (
                    <p className="text-destructive">{company.rejection_reason}</p>
                  ) : null}

                  {status === "pending" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => approveMutation.mutate(company.id)} disabled={approveMutation.isPending}>
                        {t("common.approve")}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setRejectingId(company.id)}>
                        {t("common.reject")}
                      </Button>
                    </div>
                  ) : null}

                  {rejectingId === company.id ? (
                    <div className="space-y-2 rounded-md border p-3">
                      <Input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={t("admin.rejectReason")}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectMutation.mutate({ id: company.id, reasonText: reason.trim() })}
                          disabled={!reason.trim() || rejectMutation.isPending}
                        >
                          {t("common.save")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectingId(null)}>
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
